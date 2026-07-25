pub mod handlers;

use actix_web::web;

// Configurer les routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .route("/state", web::get().to(handlers::get_state))
            .route("/tick", web::post().to(handlers::tick))
            .route("/reset", web::post().to(handlers::reset))
            .route("/toggle-pause", web::post().to(handlers::toggle_pause))
            .route("/auto", web::post().to(handlers::auto_tick))
            .route("/history", web::get().to(handlers::get_history)),
    );
}