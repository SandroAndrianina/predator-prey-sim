// ============================================================
// simulation.js - Rendu Pixi.js avec glow proportionnel à l'énergie
// et ondes de prédation. Monde : 1000x500 (rectangle).
// ============================================================

import { state, previousAgents, currentAgents, lastSnapshotTime } from './api.js';
import { logEvent } from './log-manager.js';

const SERVER_TICK_MS = 100;
const WORLD_W = 1000;
const WORLD_H = 500;

const container = document.getElementById('pixiCanvasContainer');

let app, stage, viewport, backgroundSprite;
let agentPool = new Map();          // id -> PIXI.Graphics
let isInitialized = false;

// Gestion du zoom/pan
let zoomLevel = 1;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;
let isDragging = false;
let dragStartX, dragStartY, startVX, startVY;

// ============================================================
// INITIALISATION PIXI
// ============================================================
function initPixi() {
    if (isInitialized) return;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    app = new PIXI.Application({
        width: w,
        height: h,
        backgroundColor: 0x0a0a0f,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    container.appendChild(app.view);
    stage = app.stage;

    viewport = new PIXI.Container();
    viewport.x = 0;
    viewport.y = 0;
    viewport.scale.set(1, 1);
    stage.addChild(viewport);

    createTopographicBackground();
    window.addEventListener('resize', resizeCanvas);
    setupZoomPan();

    isInitialized = true;

    requestAnimationFrame(() => {
        resizeCanvas();
    });
}

// ============================================================
// MISE À JOUR DU VIEWPORT
// ============================================================
function updateViewport(containerW, containerH, zoom) {
    const scaleX = containerW / WORLD_W;
    const scaleY = containerH / WORLD_H;
    const scale = Math.min(scaleX, scaleY) * zoom;

    viewport.scale.set(scale, scale);
    viewport.x = (containerW - WORLD_W * scale) / 2;
    viewport.y = (containerH - WORLD_H * scale) / 2;
}

// ============================================================
// FOND TOPOGRAPHIQUE
// ============================================================
function createTopographicBackground() {
    const texture = PIXI.Texture.from('/static/images/topo.jpg');

    backgroundSprite = new PIXI.Sprite(texture);
    backgroundSprite.width = WORLD_W;
    backgroundSprite.height = WORLD_H;
    backgroundSprite.alpha = 0.9;

    const worldRatio = WORLD_W / WORLD_H;

    texture.on('load', () => {
        const actualW = texture.width;
        const actualH = texture.height;
        const actualRatio = actualW / actualH;

        let cW, cH, cX, cY;
        if (actualRatio > worldRatio) {
            cH = actualH;
            cW = actualH * worldRatio;
            cX = (actualW - cW) / 2;
            cY = 0;
        } else {
            cW = actualW;
            cH = actualW / worldRatio;
            cX = 0;
            cY = (actualH - cH) / 2;
        }

        const newFrame = new PIXI.Rectangle(cX, cY, cW, cH);
        const croppedTexture = new PIXI.Texture(texture.baseTexture, newFrame);
        backgroundSprite.texture = croppedTexture;
        backgroundSprite.width = WORLD_W;
        backgroundSprite.height = WORLD_H;

        resizeCanvas();
    });

    texture.on('error', () => {
        console.warn('⚠️ Image topo non trouvée, fallback');
        const g = new PIXI.Graphics();
        g.beginFill(0x0a0a0f);
        g.drawRect(0, 0, WORLD_W, WORLD_H);
        g.endFill();
        for (let i = 0; i < 15; i++) {
            const r = 15 + i * 14;
            g.lineStyle(1, 0x00ccff, 0.06 + (i / 15) * 0.12);
            g.drawCircle(WORLD_W/2, WORLD_H/2, r);
        }
        const tex = app.renderer.generateTexture(g);
        backgroundSprite.texture = tex;
        backgroundSprite.width = WORLD_W;
        backgroundSprite.height = WORLD_H;

        resizeCanvas();
    });

    viewport.addChildAt(backgroundSprite, 0);
}

// ============================================================
// REDIMENSIONNEMENT
// ============================================================
export function resizeCanvas() {
    if (!app) return;

    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    app.renderer.resize(w, h);
    updateViewport(w, h, zoomLevel);
}

// ============================================================
// ZOOM / PAN
// ============================================================
function setupZoomPan() {
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel + delta));
        if (newZoom !== zoomLevel) {
            zoomLevel = newZoom;
            resizeCanvas();
        }
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        startVX = viewport.x;
        startVY = viewport.y;
        container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        viewport.x = startVX + dx;
        viewport.y = startVY + dy;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'default';
    });

    document.getElementById('zoomIn')?.addEventListener('click', () => {
        zoomLevel = Math.min(MAX_ZOOM, zoomLevel + 0.15);
        resizeCanvas();
    });

    document.getElementById('zoomOut')?.addEventListener('click', () => {
        zoomLevel = Math.max(MIN_ZOOM, zoomLevel - 0.15);
        resizeCanvas();
    });

    document.getElementById('resetView')?.addEventListener('click', () => {
        zoomLevel = 1;
        viewport.x = 0;
        viewport.y = 0;
        resizeCanvas();
    });
}

// ============================================================
// ONDES DE PRÉDATION
// ============================================================
let waveList = [];

export function triggerPredationWave(x, y, preyId, predatorId) {
    waveList.push({
        x,
        y,
        radius: 0,
        maxRadius: 80,
        life: 1.0,
        decay: 0.012,
        id: Date.now() + Math.random(),
    });

    logEvent('predation', `🦊 Prédateur #${predatorId} a mangé Proie #${preyId}`, {
        predatorId,
        preyId,
        x,
        y
    });
}

function updateWaves() {
    const toRemove = [];

    waveList.forEach((wave, index) => {
        wave.radius += 2.5;
        wave.life -= wave.decay;

        if (wave.life <= 0) {
            toRemove.push(index);
            return;
        }

        const g = new PIXI.Graphics();
        const alpha = wave.life * 0.7;
        g.lineStyle(2, 0xffffff, alpha);
        g.drawCircle(wave.x, wave.y, wave.radius);
        g.endFill();
        viewport.addChild(g);

        setTimeout(() => {
            viewport.removeChild(g);
            g.destroy();
        }, 50);
    });

    toRemove.reverse().forEach(idx => {
        waveList.splice(idx, 1);
    });
}

// ============================================================
// DESSIN DES AGENTS (GLOW UNIQUEMENT)
// ============================================================
export function drawAgents(agents) {
    if (!app || !viewport) return;

    const activeIds = new Set(agents.map(a => a.id));

    // Nettoyer les agents morts
    for (const [id, g] of agentPool) {
        if (!activeIds.has(id)) {
            viewport.removeChild(g);
            g.destroy();
            agentPool.delete(id);
        }
    }

    // Dessiner les agents
    agents.forEach(agent => {
        const id = agent.id;
        const isPredator = agent.species === 'Predator';
        const energy = agent.energy || 0;

        let g = agentPool.get(id);
        if (!g) {
            g = new PIXI.Graphics();
            agentPool.set(id, g);
            viewport.addChild(g);
        }

        const x = Math.max(0, Math.min(WORLD_W, agent.x));
        const y = Math.max(0, Math.min(WORLD_H, agent.y));
        const radius = isPredator ? 6 : 4;
        const color = isPredator ? 0xff0044 : 0x00ff88;

        g.clear();

        // === GLOW ===
        let glowIntensity = 0.15;
        if (isPredator) {
            // Glow proportionnel à l'énergie (0 → 30)
            glowIntensity = 0.05 + (Math.min(energy, 30) / 30) * 0.55;
            // Glow orange pour les prédateurs
            g.beginFill(0xcc44ff, glowIntensity * 0.4);
            g.drawCircle(x, y, radius * (3 + glowIntensity * 2.5));
            g.endFill();
        } else {
            // Glow vert pour les proies (faible)
            g.beginFill(0x00ff88, 0.08);
            g.drawCircle(x, y, radius * 2.5);
            g.endFill();
        }

        // Corps principal
        g.beginFill(color, 0.95);
        g.drawCircle(x, y, radius);
        g.endFill();

        // Reflet lumineux
        g.beginFill(0xffffff, 0.2);
        g.drawCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.35);
        g.endFill();
    });

    // Mettre à jour les ondes
    updateWaves();
}

// ============================================================
// INTERPOLATION
// ============================================================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function getInterpolatedAgents() {
    const elapsed = performance.now() - lastSnapshotTime;
    const t = Math.min(1, elapsed / SERVER_TICK_MS);
    const result = [];

    currentAgents.forEach((cur, id) => {
        const prev = previousAgents.get(id);
        if (prev) {
            result.push({
                id: id,
                x: lerp(prev.x, cur.x, t),
                y: lerp(prev.y, cur.y, t),
                species: cur.species,
                energy: cur.energy || 0,
            });
        } else {
            result.push({
                id: id,
                x: cur.x,
                y: cur.y,
                species: cur.species,
                energy: cur.energy || 0,
            });
        }
    });

    return result;
}

// ============================================================
// BOUCLE DE RENDU
// ============================================================
export function renderLoop() {
    if (!isInitialized) initPixi();

    app.ticker.add(() => {
        if (state.agents && state.agents.length > 0) {
            drawAgents(getInterpolatedAgents());
        }
    });
}

export function redrawAgents() {
    if (app) drawAgents(getInterpolatedAgents());
}

// ============================================================
// EXPOSER triggerPredationWave POUR LE BACKEND
// ============================================================
window.triggerPredationWave = triggerPredationWave;

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => {
        if (!isInitialized) initPixi();
        setTimeout(() => resizeCanvas(), 50);
    });
});