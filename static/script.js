// ============================================================
// CONFIGURATION
// ============================================================
const API_URL = '/api';
const POLL_INTERVAL_MS = 130; // à peu près le rythme du tick serveur (100ms)
let isPaused = false;

// ============================================================
// ÉTAT
// ============================================================
let state = {
    prey: 0,
    predators: 0,
    total: 0,
    history: [],
    ticks: 0,
    cycle: 0,
    tick: 0,
    paused: false,
    ticks_per_cycle: 10  // ← AJOUTER (valeur par défaut)
};

// Deux instantanés d'agents successifs, utilisés pour interpoler
// le mouvement affiché entre deux réponses du serveur.
let previousAgents = new Map(); // id -> {x, y, species}
let currentAgents = new Map();  // id -> {x, y, species}
let lastSnapshotTime = performance.now();

// ============================================================
// RÉFÉRENCES DOM
// ============================================================
const elements = {
    kpiPrey: document.getElementById('kpiPrey'),
    kpiPredators: document.getElementById('kpiPredators'),
    kpiTotal: document.getElementById('kpiTotal'),
    kpiTicks: document.getElementById('kpiTicks'),  // Gardé pour compatibilité
    kpiCycle: document.getElementById('kpiCycle'),  // ← AJOUTER
    kpiTick: document.getElementById('kpiTick'),    // ← AJOUTER
    badgePrey: document.getElementById('badgePrey'),
    badgePredators: document.getElementById('badgePredators'),
    badgeTick: document.getElementById('badgeTick'),
    badgeCycle: document.getElementById('badgeCycle'), // ← AJOUTER
    agentCount: document.getElementById('agentCount'),
    historyBody: document.getElementById('historyBody'),
    toggleAutoPlay: document.getElementById('toggleAutoPlay'),
    stepForward: document.getElementById('stepForward'),
    btnReset: document.getElementById('btnReset'),
    navReset: document.getElementById('navReset'),
    simulationCanvas: document.getElementById('simulationCanvas'),
};

// ============================================================
// CANVAS (Simulation)
// ============================================================
const canvas = elements.simulationCanvas;
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);

function drawAgents(agents) {
    const w = canvas.width;
    const h = canvas.height;
    const margin = 20;

    if (!agents || agents.length === 0) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#6d6d78';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Aucun agent', w / 2, h / 2);
        return;
    }

    const scale = Math.min((w - margin * 2) / 400, (h - margin * 2) / 400);
    const offsetX = (w - 400 * scale) / 2;
    const offsetY = (h - 400 * scale) / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(18,18,20,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, 400 * scale, 400 * scale);

    ctx.fillStyle = 'rgba(18,18,20,0.3)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Zone de simulation', w / 2, offsetY - 8);

    ctx.fillStyle = 'rgba(18,18,20,0.2)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${agents.length} agents`, w - margin, h - margin);

    agents.forEach(agent => {
        const x = Math.max(0, Math.min(400, agent.x));
        const y = Math.max(0, Math.min(400, agent.y));

        const screenX = offsetX + x * scale;
        const screenY = offsetY + y * scale;
        const radius = agent.species === 'Prey' ? 4 * scale : 6 * scale;

        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(radius, 2), 0, 2 * Math.PI);
        ctx.fillStyle = agent.species === 'Prey' ? '#16a34a' : '#dc2626';
        ctx.fill();

        if (agent.species === 'Predator') {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });
}

// ============================================================
// CHART.JS (Historique)
// ============================================================
const historyCtx = document.getElementById('historyChart').getContext('2d');
const historyChart = new Chart(historyCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Proies',
                data: [],
                borderColor: '#16a34a',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            },
            {
                label: 'Prédateurs',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { usePointStyle: true, padding: 20 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Population' }
            },
            x: {
                title: { display: true, text: 'Temps (Cycle)' }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    }
});

// ============================================================
// API CALLS
// ============================================================
async function fetchState() {
    try {
        const response = await fetch(`${API_URL}/state`);
        const data = await response.json();

        state = {
            prey: data.prey,
            predators: data.predators,
            total: data.total,
            history: data.history || [],
            ticks: data.history ? data.history.length : 0,
            cycle: data.cycle || 0,
            tick: data.tick || 0,
            paused: data.paused,
            ticks_per_cycle: data.ticks_per_cycle || 10,
            agents: data.agents || []  // ✅ AJOUTER CETTE LIGNE
        };
        isPaused = data.paused;

        previousAgents = currentAgents;
        currentAgents = new Map();
        (data.agents || []).forEach(a => {
            currentAgents.set(a.id, { x: a.x, y: a.y, species: a.species });
        });
        lastSnapshotTime = performance.now();

        updateStatsUI();
        return data;
    } catch (error) {
        console.error('Erreur fetchState:', error);
        return null;
    }
}

async function sendTick() {
    try {
        await fetch(`${API_URL}/tick`, { method: 'POST' });
        await fetchState();
    } catch (error) {
        console.error('Erreur sendTick:', error);
    }
}

async function resetSimulation() {
    try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
        previousAgents = new Map();
        currentAgents = new Map();
        await fetchState();
    } catch (error) {
        console.error('Erreur reset:', error);
    }
}

async function togglePause() {
    try {
        const response = await fetch(`${API_URL}/toggle-pause`, { method: 'POST' });
        const data = await response.json();
        isPaused = data.paused;
        updatePauseButton();
    } catch (error) {
        console.error('Erreur togglePause:', error);
    }
}

// ============================================================
// INTERPOLATION + BOUCLE DE RENDU (indépendante du réseau)
// ============================================================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function getInterpolatedAgents() {
    const t = Math.min(1, (performance.now() - lastSnapshotTime) / POLL_INTERVAL_MS);
    const result = [];

    currentAgents.forEach((cur, id) => {
        const prev = previousAgents.get(id);
        if (prev) {
            // Agent connu à l'instant précédent : on interpole sa position
            result.push({
                x: lerp(prev.x, cur.x, t),
                y: lerp(prev.y, cur.y, t),
                species: cur.species
            });
        } else {
            // Agent tout juste apparu (naissance) : pas d'ancienne position
            result.push({ x: cur.x, y: cur.y, species: cur.species });
        }
    });

    return result;
}

function renderLoop() {
    if (state.agents && state.agents.length > 0) {
        drawAgents(getInterpolatedAgents());
    }
    requestAnimationFrame(renderLoop);
}

// ============================================================
// UI UPDATE (KPI, graphique, tableau — pas besoin d'interpolation ici)
// ============================================================
function updateStatsUI() {
    // KPI - Vérifier que les éléments existent
    if (elements.kpiPrey) elements.kpiPrey.textContent = state.prey;
    if (elements.kpiPredators) elements.kpiPredators.textContent = state.predators;
    if (elements.kpiTotal) elements.kpiTotal.textContent = state.total;
    if (elements.badgePrey) elements.badgePrey.textContent = state.prey;
    if (elements.badgePredators) elements.badgePredators.textContent = state.predators;
    if (elements.agentCount) elements.agentCount.textContent = `${state.total} agents`;
    
    // Cycles et Ticks - Vérifier l'existence
    if (elements.kpiCycle) elements.kpiCycle.textContent = state.cycle || 0;
    if (elements.kpiTick) elements.kpiTick.textContent = state.tick || 0;
    if (elements.badgeCycle) elements.badgeCycle.textContent = state.cycle || 0;
    
    // Topbar
    const cycleDisplay = document.getElementById('cycleDisplay');
    if (cycleDisplay) {
        cycleDisplay.textContent = `Cycle ${state.cycle || 0} · Tick ${state.tick || 0}`;
    }

    if (state.history.length > 0) {
        const ticksPerCycle = state.ticks_per_cycle || 10;  // ← Utiliser la valeur du backend
        
        // Prendre UN point par cycle
        const cycleData = [];
        for (let i = 0; i < state.history.length; i += ticksPerCycle) {
            const idx = Math.min(i + ticksPerCycle - 1, state.history.length - 1);
            cycleData.push(state.history[idx]);
        }
        
        const labels = cycleData.map((_, i) => i + 1);
        const preyData = cycleData.map(h => h[0]);
        const predatorData = cycleData.map(h => h[1]);

        if (historyChart) {
            historyChart.data.labels = labels;
            historyChart.data.datasets[0].data = preyData;
            historyChart.data.datasets[1].data = predatorData;
            historyChart.update('none');
        }
    }

    updateTable();
}

function updateTable() {
    const body = elements.historyBody;
    const history = state.history;

    if (history.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Aucune donnée</td></tr>';
        return;
    }

    const start = Math.max(0, history.length - 20);
    let html = '';
    for (let i = start; i < history.length; i++) {
        const [prey, predators] = history[i];
        const total = prey + predators;
        html += `
            <tr>
                <td>#${i + 1}</td>
                <td><span style="color:#16a34a;font-weight:700;">${prey}</span></td>
                <td><span style="color:#dc2626;font-weight:700;">${predators}</span></td>
                <td>${total}</td>
            </tr>
        `;
    }
    body.innerHTML = html;
}

// ============================================================
// CONTROLS
// ============================================================
function updatePauseButton() {
    const icon = elements.toggleAutoPlay.querySelector('i');
    if (isPaused) {
        icon.className = 'fa-solid fa-play';
        elements.toggleAutoPlay.classList.remove('active');
    } else {
        icon.className = 'fa-solid fa-pause';
        elements.toggleAutoPlay.classList.add('active');
    }
}

// ============================================================
// EVENT LISTENERS (initialisés APRÈS chargement sidebar)
// ============================================================
function initEventListeners() {
    const toggleBtn = document.getElementById('toggleAutoPlay');
    const stepBtn = document.getElementById('stepForward');
    const resetBtn = document.getElementById('btnReset');
    const navReset = document.getElementById('navReset');
    
    if (toggleBtn) toggleBtn.addEventListener('click', togglePause);
    if (stepBtn) stepBtn.addEventListener('click', sendTick);
    if (resetBtn) resetBtn.addEventListener('click', resetSimulation);
    if (navReset) navReset.addEventListener('click', resetSimulation);
}

// Fonction appelée par sidebar-loader.js après chargement
window.onSidebarLoaded = function() {
    initEventListeners();
};

// ============================================================
// CHARGER LES PRESETS
// ============================================================
async function loadPresets() {
    try {
        const response = await fetch(`${API_URL}/configs`);
        const configs = await response.json();
        const select = document.getElementById('presetSelect');
        
        // Garder l'option vide
        select.innerHTML = '<option value="">-- Sélectionner un preset --</option>';
        
        configs.forEach(config => {
            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = config.name;
            select.appendChild(option);
        });
        
        return configs;
    } catch (error) {
        console.error('Erreur chargement presets:', error);
        return [];
    }
}

// ============================================================
// CHARGER UN PRESET DANS LE FORMULAIRE
// ============================================================
async function loadPreset(id) {
    try {
        const response = await fetch(`${API_URL}/configs`);
        const configs = await response.json();
        const config = configs.find(c => c.id == id);
        
        if (config) {
            document.getElementById('configName').value = config.name;
            document.getElementById('preyReproduction').value = config.prey_reproduction_rate;
            document.getElementById('preyReproductionValue').textContent = config.prey_reproduction_rate;
            document.getElementById('captureRadius').value = config.capture_radius;
            document.getElementById('captureRadiusValue').textContent = config.capture_radius;
            document.getElementById('energyGain').value = config.energy_gain;
            document.getElementById('energyGainValue').textContent = config.energy_gain;
            document.getElementById('energyLoss').value = config.energy_loss;
            document.getElementById('energyLossValue').textContent = config.energy_loss;
            document.getElementById('predatorThreshold').value = config.predator_reproduction_threshold;
            document.getElementById('predatorThresholdValue').textContent = config.predator_reproduction_threshold;
            document.getElementById('ticksPerCycle').value = config.ticks_per_cycle;
            document.getElementById('ticksPerCycleValue').textContent = config.ticks_per_cycle;
            document.getElementById('initialPrey').value = config.initial_prey;
            document.getElementById('initialPredators').value = config.initial_predators;
            document.getElementById('maxAgents').value = config.max_agents;
        }
    } catch (error) {
        console.error('Erreur chargement preset:', error);
    }
}

// ============================================================
// SAUVEGARDER UN PRESET
// ============================================================
async function saveConfig() {
    const config = getConfigFromForm();
    
    try {
        const response = await fetch(`${API_URL}/configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            alert('✅ Preset sauvegardé !');
            loadPresets();
        } else {
            alert('❌ Erreur lors de la sauvegarde');
        }
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        alert('❌ Erreur de connexion');
    }
}

// ============================================================
// APPLIQUER LA CONFIG ET REDÉMARRER
// ============================================================
async function applyAndRestart() {
    const config = getConfigFromForm();
    
    try {
        // 1. Sauvegarder la config
        const saveResponse = await fetch(`${API_URL}/configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (!saveResponse.ok) {
            alert('❌ Erreur lors de la sauvegarde');
            return;
        }
        
        const saved = await saveResponse.json();
        
        // 2. Appliquer la config (redémarrer la simulation)
        const applyResponse = await fetch(`${API_URL}/apply-config/${saved.id}`, {
            method: 'POST'
        });
        
        if (applyResponse.ok) {
            alert('✅ Configuration appliquée et simulation redémarrée !');
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
            if (modal) modal.hide();
            // Rafraîchir l'état
            await fetchState();
        } else {
            alert('❌ Erreur lors de l\'application');
        }
    } catch (error) {
        console.error('Erreur application:', error);
        alert('❌ Erreur de connexion');
    }
}

// ============================================================
// RÉCUPÉRER LES VALEURS DU FORMULAIRE
// ============================================================
function getConfigFromForm() {
    return {
        name: document.getElementById('configName').value,
        prey_reproduction_rate: parseFloat(document.getElementById('preyReproduction').value),
        capture_radius: parseFloat(document.getElementById('captureRadius').value),
        energy_gain: parseFloat(document.getElementById('energyGain').value),
        energy_loss: parseFloat(document.getElementById('energyLoss').value),
        predator_reproduction_threshold: parseFloat(document.getElementById('predatorThreshold').value),
        initial_prey: parseInt(document.getElementById('initialPrey').value),
        initial_predators: parseInt(document.getElementById('initialPredators').value),
        ticks_per_cycle: parseInt(document.getElementById('ticksPerCycle').value),
        max_agents: parseInt(document.getElementById('maxAgents').value),
        tick_interval: 0.1
    };
}

// ============================================================
// INITIALISER LES SLIDERS
// ============================================================
function initSliders() {
    const sliders = [
        'preyReproduction', 'captureRadius', 'energyGain',
        'energyLoss', 'predatorThreshold', 'ticksPerCycle'
    ];
    
    sliders.forEach(id => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(id + 'Value');
        if (slider && valueDisplay) {
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
            });
        }
    });
}

// ============================================================
// CONFIGURER LES ÉVÉNEMENTS DU MODAL
// ============================================================
function initConfigModal() {
    // Bouton "Paramètres" dans la sidebar
    const navConfig = document.getElementById('navConfig');
    if (navConfig) {
        navConfig.addEventListener('click', (e) => {
            e.preventDefault();
            loadPresets();
            const modal = new bootstrap.Modal(document.getElementById('configModal'));
            modal.show();
        });
    }
    
    // Charger un preset
    document.getElementById('presetSelect').addEventListener('change', function() {
        if (this.value) {
            loadPreset(this.value);
        }
    });
    
    // Sauvegarder
    document.getElementById('btnSaveConfig').addEventListener('click', saveConfig);
    
    // Appliquer & Redémarrer
    document.getElementById('btnApplyConfig').addEventListener('click', applyAndRestart);
    
    // Initialiser les sliders
    initSliders();
}

// ============================================================
// INITIALISATION
// ============================================================
async function init() {
    resizeCanvas();
    await fetchState();
    updatePauseButton();
    
    // Charger les presets
    await loadPresets();

    // Si la sidebar est déjà chargée (cas où script.js s'exécute après)
    if (document.getElementById('toggleAutoPlay')) {
        initEventListeners();
    }

    setInterval(fetchState, POLL_INTERVAL_MS);
    requestAnimationFrame(renderLoop);
}

init();

// ============================================================
// RESPONSIVE
// ============================================================
window.addEventListener('resize', () => {
    resizeCanvas();
});