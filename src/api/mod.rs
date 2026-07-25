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
            .route("/configs", web::get().to(handlers::get_configs))   // ← AJOUTER
            .route("/configs", web::post().to(handlers::create_config)) // ← AJOUTER
            .route("/apply-config/{id}", web::post().to(handlers::apply_config))
            .route("/apply-config-direct", web::post().to(handlers::apply_config_direct))
    );
}