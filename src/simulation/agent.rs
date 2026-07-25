use std::sync::atomic::{AtomicU64, Ordering};

// Compteur global pour générer des identifiants uniques et stables,
// indispensable pour que le frontend puisse suivre un agent précis
// d'un instantané à l'autre (et donc interpoler son mouvement).
static NEXT_ID: AtomicU64 = AtomicU64::new(0);

pub fn next_agent_id() -> u64 {
    NEXT_ID.fetch_add(1, Ordering::Relaxed)
}

#[derive(Debug, Clone)]
pub enum Species {
    Prey,
    Predator,
}

#[derive(Debug, Clone)]
pub struct Agent {
    pub id: u64,
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub energy: f64,
    pub species: Species,
}

impl Agent {
    pub fn pick_new_direction(&mut self) {
        // Vitesse modérée : avec l'interpolation côté client, pas besoin
        // d'une vitesse énorme pour "voir" le mouvement. Ajuste à l'œil.
        let speed = 40.0;
        self.vx = super::engine::get_random() * speed;
        self.vy = super::engine::get_random() * speed;
    }

    pub fn advance(&mut self, dt: f64) {
        self.x = (self.x + self.vx * dt).clamp(0.0, 400.0);
        self.y = (self.y + self.vy * dt).clamp(0.0, 400.0);
    }
}