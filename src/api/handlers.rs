use actix_web::{web, HttpResponse, Responder};
use std::sync::Mutex;
use crate::simulation::state::{SimulationState, StateResponse};
use crate::db;
use crate::simulation::config::SimulationConfig; 

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

// === ROUTE GET /api/dashboard ===
// Sert les 7 KPI + histogramme d'énergie + heatmap de densité, mis en cache
// à la fin de chaque cycle (calcul non refait à chaque appel : simple lecture).
// Tant qu'aucun cycle n'est encore terminé, renvoie 204 (pas encore de données).
pub async fn get_dashboard(data: web::Data<AppState>) -> impl Responder {
    let simulation = data.simulation.lock().unwrap();
    match &simulation.dashboard {
        Some(dashboard) => HttpResponse::Ok().json(dashboard),
        None => HttpResponse::NoContent().finish(),
    }
}

// === ROUTE GET /api/history ===
// Retourne uniquement l'historique (plus léger)
pub async fn get_history(data: web::Data<AppState>) -> impl Responder {
    let simulation = data.simulation.lock().unwrap();
    HttpResponse::Ok().json(&simulation.history)
}

// === ROUTE GET /api/configs ===
pub async fn get_configs(_data: web::Data<AppState>) -> impl Responder {  
    let conn = db::init_db().unwrap();
    let configs = db::load_all_configs(&conn).unwrap();
    HttpResponse::Ok().json(configs)
}

// === ROUTE POST /api/configs ===
pub async fn create_config(
    _data: web::Data<AppState>,  
    config: web::Json<SimulationConfig>,
) -> impl Responder {
    let conn = db::init_db().unwrap();
    let id = db::save_config(&conn, &config).unwrap();
    HttpResponse::Created().json(serde_json::json!({
        "id": id,
        "status": "ok"
    }))
}

// === ROUTE POST /api/apply-config/{id} ===
pub async fn apply_config(
    data: web::Data<AppState>,
    path: web::Path<i64>,
) -> impl Responder {
    let id = path.into_inner();
    let conn = db::init_db().unwrap();
    
    // Charger la config depuis la base
    let config = match db::load_config_by_id(&conn, id) {
        Ok(c) => c,
        Err(_) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Configuration non trouvée"
            }));
        }
    };
    
    // Appliquer la config à la simulation
    let mut simulation = data.simulation.lock().unwrap();
    simulation.apply_config(&config);
    simulation.reset();
    
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": format!("Configuration '{}' appliquée", config.name)
    }))
}

// === ROUTE POST /api/apply-config-direct ===
// Applique une config directement SANS la sauvegarder
pub async fn apply_config_direct(
    data: web::Data<AppState>,
    config: web::Json<SimulationConfig>,
) -> impl Responder {
    let mut simulation = data.simulation.lock().unwrap();
    simulation.apply_config(&config);
    simulation.reset();
    
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": format!("Configuration '{}' appliquée", config.name)
    }))
}