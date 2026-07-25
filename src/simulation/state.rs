use super::agent::Agent;
use super::engine;

// État global de la simulation
pub struct SimulationState {
    pub population: Vec<Agent>,
    pub history: Vec<(usize, usize)>,
    pub timer: f64,
    pub tick_interval: f64,
    pub paused: bool,
}

impl SimulationState {
    // Créer une nouvelle simulation
    pub fn new() -> Self {
        // Utiliser des coordonnées relatives (0..400)
        // Le frontend les mettra à l'échelle
        let population = engine::spawn_initial_population(0.0, 0.0, 400.0, 400.0);

        SimulationState {
            population,
            history: Vec::new(),
            timer: 0.0,
            tick_interval: 0.1,
            paused: false,
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

        // Changer les directions
        engine::choose_directions(&mut self.population);

        // Reproduction des proies
        engine::handle_reproduction(&mut self.population, 0.05);

        // Prédation
        engine::handle_predation(&mut self.population, 30.0, 12.0);

        // Perte d'énergie des prédateurs
        engine::handle_predator_energy(&mut self.population, 0.5);

        // Reproduction des prédateurs
        engine::handle_predator_reproduction(&mut self.population, 15.0);

        // Supprimer les prédateurs morts
        engine::remove_dead_predators(&mut self.population);

        // Enregistrer l'historique
        let (prey, predators) = engine::count_species(&self.population);
        self.history.push((prey, predators));

        if self.history.len() > 100 {
            self.history.remove(0);
        }
    }

    // Réinitialiser la simulation
    pub fn reset(&mut self) {
        self.population = engine::spawn_initial_population(0.0, 0.0, 400.0, 400.0);
        self.history.clear();
        self.timer = 0.0;
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
}

// Données simplifiées des agents pour le JSON
#[derive(serde::Serialize)]
pub struct AgentData {
    pub id: u64,
    pub x: f64,
    pub y: f64,
    pub species: String,
}

// Données d'état pour le JSON
#[derive(serde::Serialize)]
pub struct StateResponse {
    pub prey: usize,
    pub predators: usize,
    pub total: usize,
    pub history: Vec<(usize, usize)>,
    pub agents: Vec<AgentData>,
    pub paused: bool,
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
        }
    }
}