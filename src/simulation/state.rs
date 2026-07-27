use super::agent::Agent;
use super::engine;
use super::config::SimulationConfig;

// Taille de la grille de heatmap (20x20, cf. spécification).
const HEATMAP_GRID_SIZE: usize = 20;
const WORLD_W: f64 = 400.0;
const WORLD_H: f64 = 400.0;
const ENERGY_HISTOGRAM_BINS: usize = 10;
// Nombre de cycles conservés dans l'historique renvoyé par /api/dashboard
// (sert au frontend pour les tendances / min / max / moyenne des tooltips).
const KPI_HISTORY_MAX: usize = 50;

// Compteurs accumulés pendant un cycle en cours, remis à zéro à chaque
// fin de cycle (cf. conseil "population_start / deaths / reset").
#[derive(Debug, Clone, Default)]
pub struct CycleAccumulator {
    pub population_start_prey: usize,
    pub population_start_predator: usize,
    pub births_prey: i64,
    pub births_predator: i64,
    pub deaths_prey: i64,
    pub deaths_predator: i64,
    pub captures: i64,
    pub escapes: i64,
    pub prey_lifespan_ticks_sum: i64,
    pub prey_lifespan_count: i64,
}

impl CycleAccumulator {
    fn reset(&mut self, prey: usize, predators: usize) {
        self.population_start_prey = prey;
        self.population_start_predator = predators;
        self.births_prey = 0;
        self.births_predator = 0;
        self.deaths_prey = 0;
        self.deaths_predator = 0;
        self.captures = 0;
        self.escapes = 0;
        self.prey_lifespan_ticks_sum = 0;
        self.prey_lifespan_count = 0;
    }
}

// Les 7 KPI (+ ratio) calculés à la fin d'un cycle. Valeurs déjà prêtes à
// afficher — aucun calcul biologique ne doit être refait côté frontend.
#[derive(Debug, Clone, serde::Serialize)]
pub struct CycleKpis {
    pub cycle: i64,
    pub avg_predator_energy: f64,
    pub reproduction_rate: f64,        // % — (naissances totales / population_start) * 100
    pub mortality_rate: f64,           // % — (morts totales / population_start) * 100
    pub avg_prey_lifespan_cycles: f64, // durée de vie moyenne des proies capturées ce cycle, en cycles
    pub capture_rate: f64,             // % — captures / (captures + escapes)
    pub prey_predator_ratio: f64,      // proies / prédateurs
    pub net_growth_prey: f64,          // % — (naissances - morts) / population_start, proies
    pub net_growth_predator: f64,      // % — idem, prédateurs
    pub net_growth_total: f64,         // % — idem, population totale
}

// Réponse complète de /api/dashboard : KPI courants + historique (pour les
// tendances/mini-barres/tooltips calculés côté frontend à partir de valeurs
// déjà fournies) + histogramme d'énergie + heatmap de densité.
#[derive(Debug, Clone, serde::Serialize)]
pub struct DashboardResponse {
    pub current: CycleKpis,
    pub history: Vec<CycleKpis>,
    pub energy_histogram: Vec<u32>,
    pub density_heatmap: Vec<Vec<u32>>,
    pub heatmap_grid_size: usize,
}

// État global de la simulation
pub struct SimulationState {
    pub population: Vec<Agent>,
    pub history: Vec<(usize, usize)>,
    pub timer: f64,
    pub tick_interval: f64,
    pub paused: bool,
    pub current_tick: i64,
    pub ticks_per_cycle: i64,
    pub current_cycle: i64,
    pub config: SimulationConfig,
    pub cycle_acc: CycleAccumulator,
    pub kpi_history: Vec<CycleKpis>,
    pub dashboard: Option<DashboardResponse>,
}

impl SimulationState {

    pub fn with_config(config: &SimulationConfig) -> Self {
        let population = engine::spawn_initial_population(
            0.0, 0.0, 400.0, 400.0,
            config.initial_prey,
            config.initial_predators,
        );

        let (prey, predators) = engine::count_species(&population);
        let mut cycle_acc = CycleAccumulator::default();
        cycle_acc.reset(prey, predators);

        SimulationState {
            population,
            history: Vec::new(),
            timer: 0.0,
            tick_interval: config.tick_interval,
            paused: false,
            current_tick: 0,
            ticks_per_cycle: config.ticks_per_cycle,
            current_cycle: 0,
            config: config.clone(),
            cycle_acc,
            kpi_history: Vec::new(),
            dashboard: None,
        }
    }

    // Avancer d'un tick si le temps est écoulé
    pub fn update(&mut self, dt: f64) -> bool {
        self.timer += dt;

        if self.timer >= self.tick_interval {
            self.timer = 0.0;
            self.tick();
            return true;
        }
        false
    }

    pub fn tick(&mut self) {
        // Avancer les positions de tous les agents
        for agent in self.population.iter_mut() {
            agent.advance(self.tick_interval);
        }

        self.current_tick += 1;
        self.current_cycle = self.current_tick / self.ticks_per_cycle;

        // Changer les directions
        engine::choose_directions(&mut self.population);

        // Reproduction des proies
        let births_prey = engine::handle_reproduction(
            &mut self.population,
            self.config.prey_reproduction_rate,
            self.current_tick,
        );
        self.cycle_acc.births_prey += births_prey as i64;

        // Prédation (captures + échappées + durée de vie des proies mangées)
        let predation = engine::handle_predation(
            &mut self.population,
            self.config.capture_radius,
            self.config.energy_gain,
            self.current_tick,
        );
        self.cycle_acc.deaths_prey += predation.captures as i64;
        self.cycle_acc.captures += predation.captures as i64;
        self.cycle_acc.escapes += predation.escapes as i64;
        self.cycle_acc.prey_lifespan_ticks_sum += predation.lifespan_ticks_sum;
        self.cycle_acc.prey_lifespan_count += predation.lifespan_count;

        // Perte d'énergie des prédateurs
        engine::handle_predator_energy(&mut self.population, self.config.energy_loss);

        // Reproduction des prédateurs
        let births_predator = engine::handle_predator_reproduction(
            &mut self.population,
            self.config.predator_reproduction_threshold,
            self.current_tick,
        );
        self.cycle_acc.births_predator += births_predator as i64;

        // Supprimer les prédateurs morts
        let deaths_predator = engine::remove_dead_predators(&mut self.population);
        self.cycle_acc.deaths_predator += deaths_predator as i64;

        // Enregistrer l'historique
        let (prey, predators) = engine::count_species(&self.population);
        self.history.push((prey, predators));

        if self.history.len() > 100 {
            self.history.remove(0);
        }

        // Fin de cycle : figer les KPI du cycle écoulé et réinitialiser les compteurs.
        if self.current_tick % self.ticks_per_cycle == 0 {
            self.finalize_cycle(prey, predators);
        }
    }

    // Calcule les 7 KPI + histogramme + heatmap pour le cycle qui vient de
    // se terminer, les ajoute à l'historique, et réinitialise l'accumulateur.
    fn finalize_cycle(&mut self, prey: usize, predators: usize) {
        // Copie locale (légère) pour éviter tout souci d'emprunt avec les
        // mutations de self qui suivent (self.cycle_acc.reset, etc.).
        let acc = self.cycle_acc.clone();

        let population_start_total = acc.population_start_prey + acc.population_start_predator;
        let births_total = acc.births_prey + acc.births_predator;
        let deaths_total = acc.deaths_prey + acc.deaths_predator;

        let reproduction_rate = if population_start_total > 0 {
            births_total as f64 / population_start_total as f64 * 100.0
        } else {
            0.0
        };

        let mortality_rate = if population_start_total > 0 {
            deaths_total as f64 / population_start_total as f64 * 100.0
        } else {
            0.0
        };

        let avg_prey_lifespan_cycles = if acc.prey_lifespan_count > 0 && self.ticks_per_cycle > 0 {
            (acc.prey_lifespan_ticks_sum as f64 / acc.prey_lifespan_count as f64) / self.ticks_per_cycle as f64
        } else {
            0.0
        };

        let capture_rate = if (acc.captures + acc.escapes) > 0 {
            acc.captures as f64 / (acc.captures + acc.escapes) as f64 * 100.0
        } else {
            0.0
        };

        let avg_predator_energy = {
            let energies: Vec<f64> = self.population.iter()
                .filter(|a| matches!(a.species, super::agent::Species::Predator))
                .map(|a| a.energy)
                .collect();
            if energies.is_empty() {
                0.0
            } else {
                energies.iter().sum::<f64>() / energies.len() as f64
            }
        };

        let prey_predator_ratio = if predators > 0 {
            prey as f64 / predators as f64
        } else {
            0.0
        };

        let net_growth_prey = if acc.population_start_prey > 0 {
            (acc.births_prey - acc.deaths_prey) as f64 / acc.population_start_prey as f64 * 100.0
        } else {
            0.0
        };

        let net_growth_predator = if acc.population_start_predator > 0 {
            (acc.births_predator - acc.deaths_predator) as f64 / acc.population_start_predator as f64 * 100.0
        } else {
            0.0
        };

        let net_growth_total = if population_start_total > 0 {
            (births_total - deaths_total) as f64 / population_start_total as f64 * 100.0
        } else {
            0.0
        };

        let kpis = CycleKpis {
            cycle: self.current_cycle,
            avg_predator_energy,
            reproduction_rate,
            mortality_rate,
            avg_prey_lifespan_cycles,
            capture_rate,
            prey_predator_ratio,
            net_growth_prey,
            net_growth_predator,
            net_growth_total,
        };

        self.kpi_history.push(kpis.clone());
        if self.kpi_history.len() > KPI_HISTORY_MAX {
            self.kpi_history.remove(0);
        }

        let energy_histogram = engine::compute_energy_histogram(&self.population, ENERGY_HISTOGRAM_BINS);
        let density_heatmap = engine::compute_density_heatmap(&self.population, HEATMAP_GRID_SIZE, WORLD_W, WORLD_H);

        self.dashboard = Some(DashboardResponse {
            current: kpis,
            history: self.kpi_history.clone(),
            energy_histogram,
            density_heatmap,
            heatmap_grid_size: HEATMAP_GRID_SIZE,
        });

        self.cycle_acc.reset(prey, predators);
    }

    // Réinitialiser la simulation
    pub fn reset(&mut self) {
        self.population = engine::spawn_initial_population(
            0.0, 0.0, 400.0, 400.0,
            self.config.initial_prey,
            self.config.initial_predators,
        );
        self.history.clear();
        self.timer = 0.0;
        self.current_tick = 0;
        self.current_cycle = 0;

        let (prey, predators) = engine::count_species(&self.population);
        self.cycle_acc.reset(prey, predators);
        self.kpi_history.clear();
        self.dashboard = None;
    }

    // Basculer pause / lecture
    pub fn toggle_pause(&mut self) -> bool {
        self.paused = !self.paused;
        self.paused
    }

    // Obtenir les statistiques actuelles
    pub fn get_stats(&self) -> (usize, usize) {
        engine::count_species(&self.population)
    }

    // Obtenir les données des agents pour le frontend
    pub fn get_agents_data(&self) -> Vec<AgentData> {
        self.population
            .iter()
            .map(|agent| AgentData {
                id: agent.id,
                x: agent.x,
                y: agent.y,
                species: match agent.species {
                    super::agent::Species::Prey => "Prey".to_string(),
                    super::agent::Species::Predator => "Predator".to_string(),
                },
            })
            .collect()
    }

    pub fn apply_config(&mut self, config: &SimulationConfig) {
        self.config = config.clone();
        self.tick_interval = config.tick_interval;
        self.ticks_per_cycle = config.ticks_per_cycle;
        // Réinitialiser les compteurs
        self.current_tick = 0;
        self.current_cycle = 0;
        self.history.clear();
        self.kpi_history.clear();
        self.dashboard = None;
        self.timer = 0.0;
    }
}

// Données simplifiées des agents pour le JSON
#[derive(serde::Serialize)]
pub struct AgentData {
    pub id: u64,
    pub x: f64,
    pub y: f64,
    pub species: String,
}

#[derive(serde::Serialize)]
pub struct StateResponse {
    pub prey: usize,
    pub predators: usize,
    pub total: usize,
    pub history: Vec<(usize, usize)>,
    pub agents: Vec<AgentData>,
    pub paused: bool,
    pub cycle: i64,
    pub tick: i64,
    pub ticks_per_cycle: i64,
}

impl StateResponse {
    pub fn from_state(state: &SimulationState) -> Self {
        let (prey, predators) = state.get_stats();
        StateResponse {
            prey,
            predators,
            total: prey + predators,
            history: state.history.clone(),
            agents: state.get_agents_data(),
            paused: state.paused,
            cycle: state.current_cycle,
            tick: state.current_tick,
            ticks_per_cycle: state.ticks_per_cycle,
        }
    }
}
