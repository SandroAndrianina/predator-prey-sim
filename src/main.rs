mod simulation;
mod api;
mod db;  

use actix_web::{App, HttpServer, web};
use actix_files as fs;
use std::sync::Mutex;
use api::handlers::AppState;
use simulation::state::SimulationState;
use tokio::time::{interval, Duration};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialiser la base de données
    let conn = db::init_db().expect("❌ Erreur connexion DB");
    db::seed_default_config(&conn).expect("❌ Erreur seed DB");
    
    // Charger la première config
    let configs = db::load_all_configs(&conn).expect("❌ Erreur chargement configs");
    let active_config = configs.first().cloned().unwrap_or_default();
    
    // Créer la simulation avec la config chargée
    let simulation_state = SimulationState::with_config(&active_config);
    
    println!("🚀 Lancement du serveur sur http://localhost:8080");
    println!("📊 API disponible sur http://localhost:8080/api/state");
    println!("🖥️  Interface web sur http://localhost:8080/static/index.html");
    println!("📁 Base de données: simulation.db");
    println!("📋 Configuration active: {}", active_config.name);
    
    let app_state = web::Data::new(AppState {
        simulation: Mutex::new(simulation_state),
    });

        // === AJOUTER L'HORLOGE SERVEUR ===
    let app_state_clone = app_state.clone();
    tokio::spawn(async move {
        let mut interval = interval(Duration::from_millis(100));
        loop {
            interval.tick().await;
            let mut sim = app_state_clone.simulation.lock().unwrap();
            // Ne pas avancer si en pause
            if !sim.paused {
                sim.update(0.1); // dt = 0.1s (correspond au tick_interval)
            }
        }
    });

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .configure(api::configure)
            .route("/", web::get().to(|| async {
                "Predator-Prey Simulation API - Visitez /static/index.html pour l'interface"
            }))
            .service(fs::Files::new("/static", "./static").index_file("index.html"))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}