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

pub fn spawn_initial_population(sim_x: f32, sim_y: f32, sim_w: f32, sim_h: f32) -> Vec<Agent> {
    let mut population = Vec::new();
    let mut rng = rand::thread_rng();

    for _ in 0..200 {
        population.push(Agent {
            id: next_agent_id(),
            x: sim_x as f64 + rng.gen_range(10.0..sim_w as f64 - 10.0),
            y: sim_y as f64 + rng.gen_range(10.0..sim_h as f64 - 10.0),
            vx: 0.0,
            vy: 0.0,
            energy: 20.0,
            species: Species::Prey,
        });
    }
    for _ in 0..1 {
        population.push(Agent {
            id: next_agent_id(),
            x: sim_x as f64 + rng.gen_range(10.0..sim_w as f64 - 10.0),
            y: sim_y as f64 + rng.gen_range(10.0..sim_h as f64 - 10.0),
            vx: 0.0,
            vy: 0.0,
            energy: 20.0,
            species: Species::Predator,
        });
    }
    population
}

// === REPRODUCTION DES PROIES ===

pub fn handle_reproduction(population: &mut Vec<Agent>, probability: f64) {
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
                });
            }
        }
    }
    population.append(&mut newborns);
}

// === PRÉDATION ===

pub fn handle_predation(population: &mut Vec<Agent>, capture_radius: f64, energy_gain: f64) -> usize {
    let mut captures: Vec<(usize, usize)> = Vec::new();

    for (i, predator) in population.iter().enumerate() {
        if let Species::Predator = predator.species {
            let mut nearest: Option<usize> = None;
            let mut nearest_dist = capture_radius;
            for (j, prey) in population.iter().enumerate() {
                if let Species::Prey = prey.species {
                    let d = distance(predator, prey);
                    if d < nearest_dist {
                        nearest = Some(j);
                        nearest_dist = d;
                    }
                }
            }
            if let Some(prey_index) = nearest {
                captures.push((i, prey_index));
            }
        }
    }

    for (predator_index, _) in &captures {
        population[*predator_index].energy += energy_gain;
    }

    let eaten: HashSet<usize> = captures.iter().map(|(_, prey_index)| *prey_index).collect();
    let mut i = 0;
    population.retain(|_| {
        let keep = !eaten.contains(&i);
        i += 1;
        keep
    });

    captures.len()
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

pub fn handle_predator_reproduction(population: &mut Vec<Agent>, threshold: f64) {
    let current_len = population.len();
    if current_len >= MAX_AGENTS {
        return;
    }

    let mut newborns = Vec::new();
    for agent in population.iter_mut() {
        if let Species::Predator = agent.species {
            if agent.energy > threshold && current_len + newborns.len() < MAX_AGENTS {
                agent.energy /= 2.0;
                let mut child = agent.clone();
                child.id = next_agent_id(); // sinon l'enfant partagerait l'id du parent
                child.energy = agent.energy;
                newborns.push(child);
            }
        }
    }
    population.append(&mut newborns);
}

// === SUPPRESSION DES PRÉDATEURS MORTS ===

pub fn remove_dead_predators(population: &mut Vec<Agent>) {
    population.retain(|agent| {
        if let Species::Predator = agent.species {
            agent.energy > 0.0
        } else {
            true
        }
    });
}

// === COMPTAGE ===

pub fn count_species(population: &Vec<Agent>) -> (usize, usize) {
    let prey = population.iter().filter(|a| matches!(a.species, Species::Prey)).count();
    let predators = population.iter().filter(|a| matches!(a.species, Species::Predator)).count();
    (prey, predators)
}