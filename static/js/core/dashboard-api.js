// ============================================================
// dashboard-api.js - Appel à /api/dashboard (7 KPI + histogramme +
// heatmap), calculés côté Rust. Ce module ne fait AUCUN calcul
// biologique : il stocke tel quel ce que le backend renvoie.
// ============================================================

const API_URL = '/api';

// État global du dashboard, partagé par les composants d'affichage.
export let dashboardState = {
    available: false,      // false tant qu'aucun cycle n'est terminé (204)
    current: null,          // dernier CycleKpis reçu
    history: [],            // jusqu'à 50 derniers CycleKpis (pour tendances/min/max/moyenne)
    energyHistogram: [],    // 10 bins, énergie des prédateurs
    densityHeatmap: [],     // grille agrégée (grid_size x grid_size)
    heatmapGridSize: 20,
};

export async function fetchDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`);

        // 204 : aucun cycle terminé pour l'instant (simulation qui démarre).
        if (response.status === 204) {
            dashboardState.available = false;
            return null;
        }

        const data = await response.json();

        dashboardState.current = data.current;
        dashboardState.history = data.history || [];
        dashboardState.energyHistogram = data.energy_histogram || [];
        dashboardState.densityHeatmap = data.density_heatmap || [];
        dashboardState.heatmapGridSize = data.heatmap_grid_size || 20;
        dashboardState.available = true;

        return data;
    } catch (error) {
        console.error('Erreur fetchDashboard:', error);
        dashboardState.available = false;
        return null;
    }
}
