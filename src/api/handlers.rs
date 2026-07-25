use actix_web::{web, HttpResponse, Responder};
use std::sync::Mutex;
use crate::simulation::state::{SimulationState, StateResponse};

pub struct AppState {
    pub simulation: Mutex<SimulationState>,
}

// === ROUTE GET /api/state ===
// Retourne l'état actuel de la simulation en JSON
pub async fn get_state(data: web::Data<AppState>) -> impl Responder {
    let simulation = data.simulation.lock().unwrap();
    let response = StateResponse::from_state(&simulation);
    HttpResponse::Ok().json(response)
}

// === ROUTE POST /api/tick ===
// Avance d'un tick manuellement et retourne le nouvel état
pub async fn tick(data: web::Data<AppState>) -> impl Responder {
    let mut simulation = data.simulation.lock().unwrap();
    simulation.tick();
    let response = StateResponse::from_state(&simulation);
    HttpResponse::Ok().json(response)
}

// === ROUTE POST /api/reset ===
pub async fn reset(data: web::Data<AppState>) -> impl Responder {
    let mut simulation = data.simulation.lock().unwrap();
    simulation.reset();
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "Simulation réinitialisée"
    }))
}

// === ROUTE POST /api/toggle-pause ===
// Met en pause / relance l'horloge côté serveur
pub async fn toggle_pause(data: web::Data<AppState>) -> impl Responder {
    let mut simulation = data.simulation.lock().unwrap();
    let paused = simulation.toggle_pause();
    HttpResponse::Ok().json(serde_json::json!({ "paused": paused }))
}

// === ROUTE POST /api/auto ===
// Avance automatiquement de plusieurs ticks (gardé pour compatibilité)
pub async fn auto_tick(data: web::Data<AppState>, query: web::Query<AutoTickParams>) -> impl Responder {
    let mut simulation = data.simulation.lock().unwrap();
    let steps = query.steps.unwrap_or(1);

    for _ in 0..steps {
        simulation.tick();
    }

    let response = StateResponse::from_state(&simulation);
    HttpResponse::Ok().json(response)
}

// Paramètres pour l'auto-play
#[derive(serde::Deserialize)]
pub struct AutoTickParams {
    steps: Option<usize>,
}

// === ROUTE GET /api/history ===
// Retourne uniquement l'historique (plus léger)
pub async fn get_history(data: web::Data<AppState>) -> impl Responder {
    let simulation = data.simulation.lock().unwrap();
    HttpResponse::Ok().json(&simulation.history)
}