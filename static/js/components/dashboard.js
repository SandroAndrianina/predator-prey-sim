// ============================================================
// dashboard.js - Mise en forme des 7 KPI avancés + histogramme
// d'énergie.
//
// IMPORTANT (répartition backend/frontend) : toutes les valeurs
// biologiques (moyennes, taux, ratios) arrivent déjà calculées par
// le backend Rust dans dashboardState.history. Ce module ne fait
// QUE de la mise en forme : flèche de tendance (comparaison de deux
// valeurs déjà reçues), largeur de mini-barre (par rapport au max
// déjà reçu sur la fenêtre), et contenu de tooltip (max/min/moyenne
// sur les valeurs déjà reçues). Aucune nouvelle statistique
// biologique n'est calculée ici.
// ============================================================

import { dashboardState } from '../core/dashboard-api.js';

// Récupérer tippy depuis window (chargé via CDN)
const tippy = window.tippy;

const TREND_WINDOW_SIZE = 10;

// Définition des 7 KPI. `key` correspond au champ CycleKpis renvoyé
// par /api/dashboard.
const KPI_DEFS = [
    { key: 'avg_predator_energy', label: 'Énergie moy. prédateurs', icon: 'fa-solid fa-bolt', unit: '', decimals: 1 },
    { key: 'reproduction_rate', label: 'Taux de reproduction', icon: 'fa-solid fa-egg', unit: '%', decimals: 1 },
    { key: 'mortality_rate', label: 'Mortalité', icon: 'fa-solid fa-skull', unit: '%', decimals: 1 },
    { key: 'avg_prey_lifespan_cycles', label: 'Durée de vie proies', icon: 'fa-solid fa-hourglass-half', unit: ' cycles', decimals: 1 },
    { key: 'capture_rate', label: 'Taux de capture', icon: 'fa-solid fa-crosshairs', unit: '%', decimals: 1 },
    { key: 'prey_predator_ratio', label: 'Ratio proies/préd.', icon: 'fa-solid fa-scale-balanced', unit: '', decimals: 2 },
    { key: 'net_growth_total', label: 'Croissance nette', icon: 'fa-solid fa-chart-line', unit: '%', decimals: 1 },
];

function formatValue(value, decimals, unit) {
    if (value === undefined || value === null || Number.isNaN(value)) return '--';
    return `${value.toFixed(decimals)}${unit}`;
}

// Compare deux valeurs déjà reçues -> simple présentation (▲ / ▼ / —).
function trendArrow(current, previous) {
    const eps = 0.001;
    const diff = current - previous;
    if (diff > eps) return { symbol: '▲', cls: 'trend-up' };
    if (diff < -eps) return { symbol: '▼', cls: 'trend-down' };
    return { symbol: '—', cls: 'trend-flat' };
}

// Construit dynamiquement les 7 cartes KPI (une fois), pour éviter de
// dupliquer le markup HTML statique dans index.html.
export function buildAdvancedKpiCards() {
    const grid = document.getElementById('advancedKpiGrid');
    if (!grid || grid.dataset.built === 'true') return;

    grid.innerHTML = KPI_DEFS.map(def => `
        <div class="kpi-adv-card" data-kpi="${def.key}">
            <div class="kpi-adv-header">
                <span class="kpi-adv-icon"><i class="${def.icon}"></i></span>
                <span class="kpi-adv-label">${def.label}</span>
                <span class="kpi-adv-trend trend-flat">—</span>
            </div>
            <div class="kpi-adv-value">--</div>
            <div class="kpi-adv-bar"><div class="kpi-adv-bar-fill"></div></div>
        </div>
    `).join('');

    grid.dataset.built = 'true';
}

// Initialise les tooltips Tippy.js sur toutes les cartes KPI
function initTooltips() {
    if (!tippy) {
        console.warn('Tippy.js non chargé');
        return;
    }

    document.querySelectorAll('.kpi-adv-card').forEach(card => {
        // Éviter de recréer les tooltips à chaque mise à jour
        if (card._tippy) return;

        const content = card.dataset.tooltip || 'Aucune donnée';
        card._tippy = tippy(card, {
            content: content,
            theme: 'dark',
            placement: 'top',
            animation: 'scale',
            delay: [200, 0],
            maxWidth: 280,
            interactive: false,
            arrow: true,
        });
    });
}

// Met à jour le contenu des tooltips (utile si les données changent)
function updateTooltips() {
    if (!tippy) return;

    document.querySelectorAll('.kpi-adv-card').forEach(card => {
        const content = card.dataset.tooltip || 'Aucune donnée';
        if (card._tippy) {
            card._tippy.setContent(content);
        }
    });
}

export function updateAdvancedKpis() {
    const history = dashboardState.history;
    if (!dashboardState.available || history.length === 0) return;

    const current = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : current;
    const trendWindow = history.slice(-TREND_WINDOW_SIZE);

    KPI_DEFS.forEach(def => {
        const card = document.querySelector(`[data-kpi="${def.key}"]`);
        if (!card) return;

        const value = current[def.key];

        const valueEl = card.querySelector('.kpi-adv-value');
        if (valueEl) valueEl.textContent = formatValue(value, def.decimals, def.unit);

        const { symbol, cls } = trendArrow(value, previous[def.key]);
        const trendEl = card.querySelector('.kpi-adv-trend');
        if (trendEl) {
            trendEl.textContent = symbol;
            trendEl.className = `kpi-adv-trend ${cls}`;
        }

        // Mini-barre : proportion par rapport au max (valeur absolue) déjà
        // reçu sur la fenêtre de tendance.
        const windowValues = trendWindow.map(h => h[def.key]);
        const barMax = Math.max(...windowValues.map(v => Math.abs(v))) || 1;
        const barEl = card.querySelector('.kpi-adv-bar-fill');
        if (barEl) {
            const pct = Math.min(100, (Math.abs(value) / barMax) * 100);
            barEl.style.width = `${pct}%`;
            barEl.classList.toggle('bar-negative', value < 0);
        }

        // Tooltip : max / min / moyenne sur la fenêtre déjà reçue.
        const max = Math.max(...windowValues);
        const min = Math.min(...windowValues);
        const avg = windowValues.reduce((s, v) => s + v, 0) / windowValues.length;
        card.setAttribute(
            'data-tooltip',
            `Max ${formatValue(max, def.decimals, def.unit)} · Min ${formatValue(min, def.decimals, def.unit)} · Moy ${formatValue(avg, def.decimals, def.unit)} (${windowValues.length} derniers cycles)`
        );
    });

    // Initialiser les tooltips (une seule fois)
    initTooltips();

    // Mettre à jour le contenu des tooltips
    updateTooltips();
}

export function updateEnergyHistogram() {
    const container = document.getElementById('energyHistogram');
    if (!container || !dashboardState.available) return;

    const bins = dashboardState.energyHistogram;
    if (!bins || bins.length === 0) return;

    const max = Math.max(...bins, 1);

    container.innerHTML = bins.map(count => {
        const heightPct = max > 0 ? (count / max) * 100 : 0;
        return `<div class="histogram-bar" style="height:${heightPct}%" data-tooltip="${count} prédateur(s)"></div>`;
    }).join('');
}