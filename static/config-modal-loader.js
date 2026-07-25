document.addEventListener('DOMContentLoaded', function() {
    fetch('/static/config-modal.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('configModalContainer').innerHTML = html;
            
            // ✅ Appeler initConfigModal APRÈS l'injection
            if (typeof initConfigModal === 'function') {
                initConfigModal();
            } else {
                console.warn('⚠️ initConfigModal non disponible');
            }
        })
        .catch(err => console.error('Erreur chargement config modal:', err));
});