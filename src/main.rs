mod simulation;
mod api;

use actix_web::{App, HttpServer, web};
use actix_files as fs;
use std::sync::Mutex;
use tokio::time::{sleep, Duration};
use api::handlers::AppState;
use simulation::state::SimulationState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 Lancement du serveur sur http://localhost:8080");
    println!("📊 API disponible sur http://localhost:8080/api/state");
    println!("🖥️  Interface web sur http://localhost:8080/static/index.html");

    let app_state = web::Data::new(AppState {
        simulation: Mutex::new(SimulationState::new()),
    });

    // La simulation tourne toute seule en arrière-plan, indépendamment
    // des requêtes HTTP. Le bouton pause ne fait que basculer un drapeau
    // que cette boucle consulte à chaque itération.
    {
        let app_state = app_state.clone();
        tokio::spawn(async move {
            loop {
                sleep(Duration::from_millis(100)).await;
                let mut sim = app_state.simulation.lock().unwrap();
                if !sim.paused {
                    sim.tick();
                }
            }
        });
    }

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .configure(api::configure)
            .route("/", web::get().to(|| async {
                "🦁 Predator-Prey Simulation API - Visitez /static/index.html pour l'interface"
            }))
            .service(fs::Files::new("/static", "./static").index_file("index.html"))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}