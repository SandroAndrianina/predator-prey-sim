use super::agent::{next_agent_id, Agent, Species};
use rand::Rng;
use std::collections::HashSet;

// Constante pour limiter le nombre d'agents
pub const MAX_AGENTS: usize = 2000;

// === FONCTIONS DE MOUVEMENT ===

pub fn choose_directions(population: &mut Vec<Agent>) {
    for agent in population.iter_mut() {
        agent.pick_new_direction();
    }
}

pub fn advance_positions(population: &mut Vec<Agent>, dt: f64) {
    for agent in population.iter_mut() {
        agent.advance(dt);
    }
}

// === FONCTIONS UTILITAIRES ===

pub fn get_random() -> f64 {
    let mut rng = rand::thread_rng();
    rng.gen_range(-1.0..1.0)
}

pub fn distance(a: &Agent, b: &Agent) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    (dx * dx + dy * dy).sqrt()
}

pub fn spawn_initial_population(
    sim_x: f32,
    sim_y: f32,
    sim_w: f32,
    sim_h: f32,
    initial_prey: i64,
    initial_predators: i64,
) -> Vec<Agent> {
    let mut population = Vec::new();
    let mut rng = rand::thread_rng();

    for _ in 0..initial_prey {
        population.push(Agent {
            id: next_agent_id(),
            x: sim_x as f64 + rng.gen_range(10.0..sim_w as f64 - 10.0),
            y: sim_y as f64 + rng.gen_range(10.0..sim_h as f64 - 10.0),
            vx: 0.0,
            vy: 0.0,
            energy: 20.0,
            species: Species::Prey,
            birth_tick: 0,
        });
    }
    for _ in 0..initial_predators {
        population.push(Agent {
            id: next_agent_id(),
            x: sim_x as f64 + rng.gen_range(10.0..sim_w as f64 - 10.0),
            y: sim_y as f64 + rng.gen_range(10.0..sim_h as f64 - 10.0),
            vx: 0.0,
            vy: 0.0,
            energy: 20.0,
            species: Species::Predator,
            birth_tick: 0,
        });
    }
    population
}

// === REPRODUCTION DES PROIES ===
// Retourne le nombre de naissances (utilisé pour les compteurs de cycle).
pub fn handle_reproduction(population: &mut Vec<Agent>, probability: f64, current_tick: i64) -> usize {
    let mut newborns = Vec::new();
    for agent in population.iter() {
        if let Species::Prey = agent.species {
            let mut rng = rand::thread_rng();
            if rng.gen_bool(probability) && population.len() + newborns.len() < MAX_AGENTS {
                newborns.push(Agent {
                    id: next_agent_id(),
                    x: agent.x,
                    y: agent.y,
                    vx: 0.0,
                    vy: 0.0,
                    energy: 20.0,
                    species: Species::Prey,
                    birth_tick: current_tick,
                });
            }
        }
    }
    let count = newborns.len();
    population.append(&mut newborns);
    count
}

// === PRÉDATION ===

// Résultat détaillé d'un tick de prédation : nécessaire pour calculer le
// taux de capture et la durée de vie moyenne des proies côté dashboard.
pub struct PredationResult {
    pub captures: usize,       // proies distinctes capturées ce tick
    pub escapes: usize,        // proies à portée d'un prédateur mais non retenues (pas la plus proche)
    pub lifespan_ticks_sum: i64, // somme des durées de vie (en ticks) des proies capturées ce tick
    pub lifespan_count: i64,     // nombre de proies capturées ce tick (pour la moyenne)
}

pub fn handle_predation(
    population: &mut Vec<Agent>,
    capture_radius: f64,
    energy_gain: f64,
    current_tick: i64,
) -> PredationResult {
    // Pour chaque prédateur : on liste TOUTES les proies à portée
    // (capture_radius). La plus proche est capturée ; les autres comptent
    // comme "échappées" (à portée mais pas choisies, car un prédateur ne
    // mange qu'une seule proie par tick).
    let mut captured_by_predator: Vec<(usize, usize)> = Vec::new(); // (index prédateur, index proie)
    let mut escapes: usize = 0;

    for (i, predator) in population.iter().enumerate() {
        if !matches!(predator.species, Species::Predator) {
            continue;
        }

        let mut candidates: Vec<usize> = Vec::new();
        for (j, prey) in population.iter().enumerate() {
            if matches!(prey.species, Species::Prey) && distance(predator, prey) < capture_radius {
                candidates.push(j);
            }
        }
        if candidates.is_empty() {
            continue;
        }

        let mut nearest_idx = candidates[0];
        let mut nearest_dist = distance(predator, &population[nearest_idx]);
        for &j in candidates.iter().skip(1) {
            let d = distance(predator, &population[j]);
            if d < nearest_dist {
                nearest_dist = d;
                nearest_idx = j;
            }
        }

        captured_by_predator.push((i, nearest_idx));
        escapes += candidates.len() - 1;
    }

    for (predator_index, _) in &captured_by_predator {
        population[*predator_index].energy += energy_gain;
    }

    // Dédoublonnage : si deux prédateurs visaient la même proie, elle n'est
    // retirée qu'une fois (comportement inchangé par rapport à l'existant).
    let eaten: HashSet<usize> = captured_by_predator.iter().map(|(_, prey_index)| *prey_index).collect();

    let mut lifespan_ticks_sum: i64 = 0;
    let mut lifespan_count: i64 = 0;
    for &prey_index in &eaten {
        let prey = &population[prey_index];
        lifespan_ticks_sum += current_tick - prey.birth_tick;
        lifespan_count += 1;
    }
    let captures = eaten.len();

    let mut i = 0;
    population.retain(|_| {
        let keep = !eaten.contains(&i);
        i += 1;
        keep
    });

    PredationResult {
        captures,
        escapes,
        lifespan_ticks_sum,
        lifespan_count,
    }
}

// === GESTION DE L'ÉNERGIE DES PRÉDATEURS ===

pub fn handle_predator_energy(population: &mut Vec<Agent>, energy_loss: f64) {
    for agent in population.iter_mut() {
        if let Species::Predator = agent.species {
            agent.energy -= energy_loss;
        }
    }
}

// === REPRODUCTION DES PRÉDATEURS ===
// Retourne le nombre de naissances (utilisé pour les compteurs de cycle).
pub fn handle_predator_reproduction(population: &mut Vec<Agent>, threshold: f64, current_tick: i64) -> usize {
    let current_len = population.len();
    if current_len >= MAX_AGENTS {
        return 0;
    }

    let mut newborns = Vec::new();
    for agent in population.iter_mut() {
        if let Species::Predator = agent.species {
            if agent.energy > threshold && current_len + newborns.len() < MAX_AGENTS {
                agent.energy /= 2.0;
                let mut child = agent.clone();
                child.id = next_agent_id(); // sinon l'enfant partagerait l'id du parent
                child.energy = agent.energy;
                child.birth_tick = current_tick;
                newborns.push(child);
            }
        }
    }
    let count = newborns.len();
    population.append(&mut newborns);
    count
}

// === SUPPRESSION DES PRÉDATEURS MORTS ===
// Retourne le nombre de prédateurs retirés (mortalité).
pub fn remove_dead_predators(population: &mut Vec<Agent>) -> usize {
    let before = population.len();
    population.retain(|agent| {
        if let Species::Predator = agent.species {
            agent.energy > 0.0
        } else {
            true
        }
    });
    before - population.len()
}

// === COMPTAGE ===

pub fn count_species(population: &Vec<Agent>) -> (usize, usize) {
    let prey = population.iter().filter(|a| matches!(a.species, Species::Prey)).count();
    let predators = population.iter().filter(|a| matches!(a.species, Species::Predator)).count();
    (prey, predators)
}

// === HISTOGRAMME D'ÉNERGIE (10 bins, prédateurs uniquement) ===
// Bornes dynamiques (min/max de l'énergie des prédateurs présents), car
// l'énergie n'a pas de plafond fixe dans ce modèle.
pub fn compute_energy_histogram(population: &Vec<Agent>, bins: usize) -> Vec<u32> {
    let energies: Vec<f64> = population
        .iter()
        .filter(|a| matches!(a.species, Species::Predator))
        .map(|a| a.energy)
        .collect();

    let mut histogram = vec![0u32; bins];
    if energies.is_empty() {
        return histogram;
    }

    let min = energies.iter().cloned().fold(f64::INFINITY, f64::min);
    let max = energies.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    if (max - min).abs() < f64::EPSILON {
        // Toutes les valeurs sont identiques : tout dans le premier bin.
        histogram[0] = energies.len() as u32;
        return histogram;
    }

    for e in energies {
        let ratio = (e - min) / (max - min);
        let idx = ((ratio * bins as f64) as usize).min(bins - 1);
        histogram[idx] += 1;
    }
    histogram
}

// === HEATMAP DE DENSITÉ (grille agrégée, jamais les positions brutes) ===
pub fn compute_density_heatmap(
    population: &Vec<Agent>,
    grid_size: usize,
    world_w: f64,
    world_h: f64,
) -> Vec<Vec<u32>> {
    let mut grid = vec![vec![0u32; grid_size]; grid_size];
    let cell_w = world_w / grid_size as f64;
    let cell_h = world_h / grid_size as f64;

    for agent in population.iter() {
        let cx = ((agent.x / cell_w) as usize).min(grid_size - 1);
        let cy = ((agent.y / cell_h) as usize).min(grid_size - 1);
        grid[cy][cx] += 1;
    }
    grid
}
