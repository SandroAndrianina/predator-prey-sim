// ============================================================
// helpers.js - Fonctions utilitaires réutilisables
// ============================================================

// Interpolation linéaire
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Générer une couleur aléatoire
export function randomColor() {
    const colors = ['#16a34a', '#dc2626', '#2563eb', '#f59e0b', '#8b5cf6'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Formater un nombre
export function formatNumber(n) {
    return n.toLocaleString('fr-FR');
}

// Clamp une valeur entre min et max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Debounce (pour éviter trop d'appels)
export function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}