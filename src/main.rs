use macroquad::prelude::*;
use ::rand::Rng;
use std::collections::HashSet;

#[derive(Debug)]
enum Species {
    Prey,
    Predator,
}

#[derive(Debug)]
struct Agent {
    x: f64,
    y: f64,
    energy: f64,
    species: Species,
}

impl Agent{
        fn move_randomly(&mut self) {
            self.x += get_random();
            self.y += get_random();
    }
}

fn get_random() -> f64 {
    let mut rng = ::rand::thread_rng();
    rng.gen_range(-1.0..1.0)
}

fn distance(a: &Agent, b: &Agent) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    (dx * dx + dy * dy).sqrt()
}

fn spawn_initial_population() -> Vec<Agent> {
    let mut population = Vec::new();
    for _ in 0..15 {
        population.push(Agent { x: get_random() * 10.0, y: get_random() * 10.0, energy: 20.0, species: Species::Prey });
    }
    for _ in 0..4 {
        population.push(Agent { x: get_random() * 10.0, y: get_random() * 10.0, energy: 20.0, species: Species::Predator });
    }
    population
}

fn move_agents(population: &mut Vec<Agent>) {
    for agent in population.iter_mut() {
        agent.move_randomly();
    }
}

fn handle_reproduction(population: &mut Vec<Agent>, probability: f64) {
    let mut newborns = Vec::new();
    for agent in population.iter() {
        if let Species::Prey = agent.species {
            let mut rng = ::rand::thread_rng();
            if rng.gen_bool(probability) {
                newborns.push(Agent { x: agent.x, y: agent.y, energy: 20.0, species: Species::Prey });
            }
        }
    }
    population.append(&mut newborns);
}

fn handle_predation(population: &mut Vec<Agent>, capture_radius: f64, energy_gain: f64) -> usize {
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

fn handle_predator_energy(population: &mut Vec<Agent>, energy_loss: f64) {
    for agent in population.iter_mut() {
        if let Species::Predator = agent.species {
            agent.energy -= energy_loss;
        }
    }
}

fn handle_predator_reproduction(population: &mut Vec<Agent>, threshold: f64) {
    let mut newborns = Vec::new();
    for agent in population.iter_mut() {
        if let Species::Predator = agent.species {
            if agent.energy > threshold {
                agent.energy /= 2.0;
                newborns.push(Agent { x: agent.x, y: agent.y, energy: agent.energy, species: Species::Predator });
            }
        }
    }
    population.append(&mut newborns);
}

fn remove_dead_predators(population: &mut Vec<Agent>) {
    population.retain(|agent| {
        if let Species::Predator = agent.species {
            agent.energy > 0.0
        } else {
            true
        }
    });
}

fn count_species(population: &Vec<Agent>) -> (usize, usize) {
    let prey = population.iter().filter(|a| matches!(a.species, Species::Prey)).count();
    let predators = population.iter().filter(|a| matches!(a.species, Species::Predator)).count();
    (prey, predators)
}

#[macroquad::main("Predator-Prey Simulation")]
async fn main() {
    let mut population = spawn_initial_population();
    let mut timer = 0.0;
    let tick_interval = 0.15; // un tick de simulation toutes les 0.15 secondes

    loop {
        clear_background(WHITE);

        timer += get_frame_time();
        if timer >= tick_interval {
            timer = 0.0;
            move_agents(&mut population);
            handle_reproduction(&mut population, 0.05);
            handle_predation(&mut population, 0.3, 10.0);
            handle_predator_energy(&mut population, 1.0);
            handle_predator_reproduction(&mut population, 30.0);
            remove_dead_predators(&mut population);
        }

        for agent in &population {
            let color = match agent.species {
                Species::Prey => GREEN,
                Species::Predator => RED,
            };
            let screen_x = agent.x as f32 * 30.0 + 50.0;
            let screen_y = agent.y as f32 * 30.0 + 50.0;
            draw_circle(screen_x, screen_y, 5.0, color);
        }

        next_frame().await;
    }
}