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
    ticks: 0
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
    kpiTicks: document.getElementById('kpiTicks'),
    badgePrey: document.getElementById('badgePrey'),
    badgePredators: document.getElementById('badgePredators'),
    badgeTick: document.getElementById('badgeTick'),
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
                title: { display: true, text: 'Temps (ticks)' }
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
            ticks: data.history ? data.history.length : 0
        };
        isPaused = data.paused;

        // On glisse l'ancien instantané vers "previous", et on stocke
        // le nouveau dans "current" — c'est entre ces deux-là qu'on
        // va interpoler à chaque frame affichée.
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
    drawAgents(getInterpolatedAgents());
    requestAnimationFrame(renderLoop);
}

// ============================================================
// UI UPDATE (KPI, graphique, tableau — pas besoin d'interpolation ici)
// ============================================================
function updateStatsUI() {
    elements.kpiPrey.textContent = state.prey;
    elements.kpiPredators.textContent = state.predators;
    elements.kpiTotal.textContent = state.total;
    elements.kpiTicks.textContent = state.ticks;
    elements.badgePrey.textContent = state.prey;
    elements.badgePredators.textContent = state.predators;
    elements.agentCount.textContent = `${state.total} agents`;

    if (state.history.length > 0) {
        const labels = state.history.map((_, i) => i);
        const preyData = state.history.map(h => h[0]);
        const predatorData = state.history.map(h => h[1]);

        historyChart.data.labels = labels;
        historyChart.data.datasets[0].data = preyData;
        historyChart.data.datasets[1].data = predatorData;
        historyChart.update('none');
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
// EVENT LISTENERS
// ============================================================
elements.toggleAutoPlay.addEventListener('click', togglePause);
elements.stepForward.addEventListener('click', sendTick);
elements.btnReset.addEventListener('click', resetSimulation);
elements.navReset.addEventListener('click', resetSimulation);

// ============================================================
// INITIALISATION
// ============================================================
async function init() {
    resizeCanvas();
    await fetchState();
    updatePauseButton();

    // On interroge le serveur au même rythme que son horloge interne
    // (100ms) — juste pour LIRE l'état, jamais pour le faire avancer.
    setInterval(fetchState, POLL_INTERVAL_MS);

    // Le rendu, lui, tourne à la fréquence d'affichage de l'écran,
    // indépendamment du réseau — c'est ça qui rend le mouvement fluide.
    requestAnimationFrame(renderLoop);
}

init();

// ============================================================
// RESPONSIVE
// ============================================================
window.addEventListener('resize', () => {
    resizeCanvas();
});