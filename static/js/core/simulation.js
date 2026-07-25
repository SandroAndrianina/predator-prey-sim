// ============================================================
// simulation.js - Canvas et rendu des agents
// ============================================================

import { state, previousAgents, currentAgents, lastSnapshotTime, fetchState } from './api.js';

const POLL_INTERVAL_MS = 130;

// Références DOM
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// ============================================================
// CANVAS
// ============================================================
export function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);

// ============================================================
// DESSIN DES AGENTS
// ============================================================
export function drawAgents(agents) {
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
// INTERPOLATION
// ============================================================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function getInterpolatedAgents() {
    const t = Math.min(1, (performance.now() - lastSnapshotTime) / POLL_INTERVAL_MS);
    const result = [];

    currentAgents.forEach((cur, id) => {
        const prev = previousAgents.get(id);
        if (prev) {
            result.push({
                x: lerp(prev.x, cur.x, t),
                y: lerp(prev.y, cur.y, t),
                species: cur.species
            });
        } else {
            result.push({ x: cur.x, y: cur.y, species: cur.species });
        }
    });

    return result;
}

// ============================================================
// BOUCLE DE RENDU
// ============================================================
export function renderLoop() {
    drawAgents(getInterpolatedAgents());
    requestAnimationFrame(renderLoop);
}