use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationConfig {
    pub id: Option<i64>,
    pub name: String,
    pub prey_reproduction_rate: f64,
    pub capture_radius: f64,
    pub energy_gain: f64,
    pub energy_loss: f64,
    pub predator_reproduction_threshold: f64,
    pub initial_prey: i64,
    pub initial_predators: i64,
    pub ticks_per_cycle: i64,
    pub max_agents: i64,
    pub tick_interval: f64,
}

impl Default for SimulationConfig {
    fn default() -> Self {
        SimulationConfig {
            id: None,
            name: "Écosystème équilibré".to_string(),
            prey_reproduction_rate: 0.05,
            capture_radius: 30.0,
            energy_gain: 12.0,
            energy_loss: 0.5,
            predator_reproduction_threshold: 15.0,
            initial_prey: 15,
            initial_predators: 5,
            ticks_per_cycle: 10,
            max_agents: 2000,
            tick_interval: 0.1,
        }
    }
}