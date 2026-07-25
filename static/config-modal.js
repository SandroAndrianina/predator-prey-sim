// ============================================================
// CONFIG MODAL - Logique
// ============================================================

let currentConfig = {};
// ============================================================
// CONFIG MODAL - Logique
// ============================================================

// ============================================================
// CHARGER LES PRESETS DANS LA LISTE
// ============================================================
async function loadPresets() {
    try {
        const response = await fetch(`${API_URL}/configs`);
        const configs = await response.json();
        const select = document.getElementById('presetSelect');
        
        select.innerHTML = '<option value="">-- Sélectionner un preset --</option>';
        
        configs.forEach(config => {
            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = config.name;
            option.dataset.preview = JSON.stringify({
                prey: config.initial_prey,
                predators: config.initial_predators,
                repro: config.prey_reproduction_rate,
                radius: config.capture_radius,
                gain: config.energy_gain,
                cycles: config.ticks_per_cycle
            });
            select.appendChild(option);
        });
        
        return configs;
    } catch (error) {
        console.error('Erreur chargement presets:', error);
        return [];
    }
}

// ============================================================
// AFFICHER LA PRÉVISUALISATION AU SURVOL
// ============================================================
function initPresetPreview() {
    const select = document.getElementById('presetSelect');
    const preview = document.getElementById('presetPreview');
    
    if (!select || !preview) return;
    
    select.addEventListener('change', function() {
        const selected = this.options[this.selectedIndex];
        if (selected && selected.value && selected.dataset.preview) {
            try {
                const data = JSON.parse(selected.dataset.preview);
                document.getElementById('previewPrey').textContent = data.prey || '-';
                document.getElementById('previewPredators').textContent = data.predators || '-';
                document.getElementById('previewRepro').textContent = data.repro || '-';
                document.getElementById('previewRadius').textContent = data.radius || '-';
                document.getElementById('previewGain').textContent = data.gain || '-';
                document.getElementById('previewCycles').textContent = data.cycles || '-';
                preview.style.display = 'block';
            } catch (e) {
                preview.style.display = 'none';
            }
        } else {
            preview.style.display = 'none';
        }
    });
    
    select.addEventListener('mouseover', function(e) {
        const option = e.target;
        if (option.tagName === 'OPTION' && option.value && option.dataset.preview) {
            try {
                const data = JSON.parse(option.dataset.preview);
                document.getElementById('previewPrey').textContent = data.prey || '-';
                document.getElementById('previewPredators').textContent = data.predators || '-';
                document.getElementById('previewRepro').textContent = data.repro || '-';
                document.getElementById('previewRadius').textContent = data.radius || '-';
                document.getElementById('previewGain').textContent = data.gain || '-';
                document.getElementById('previewCycles').textContent = data.cycles || '-';
                preview.style.display = 'block';
            } catch (e) {
                preview.style.display = 'none';
            }
        }
    });
    
    select.addEventListener('mouseout', function() {
        if (!this.value) {
            preview.style.display = 'none';
        }
    });
}

// ============================================================
// CHARGER UN PRESET DANS LE FORMULAIRE
// ============================================================
async function loadPresetIntoForm(id) {
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
        const applyResponse = await fetch(`${API_URL}/apply-config-direct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (applyResponse.ok) {
            alert('✅ Configuration appliquée et simulation redémarrée !');
            const modal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
            if (modal) modal.hide();
            await fetchState();
            // Forcer le re-dessin des agents
            drawAgents(state.agents);
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
// INITIALISATION DU MODAL
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
    
    // Bouton "Charger" un preset
    const btnLoad = document.getElementById('btnLoadPreset');
    if (btnLoad) {
        btnLoad.addEventListener('click', async function() {
            const select = document.getElementById('presetSelect');
            if (select.value) {
                await loadPresetIntoForm(select.value);
                document.getElementById('presetPreview').style.display = 'none';
                
                const config = getConfigFromForm();
                try {
                    const response = await fetch(`${API_URL}/apply-config-direct`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(config)
                    });
                    
                    if (response.ok) {
                        alert('✅ Preset chargé et simulation redémarrée !');
                        const modal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
                        if (modal) modal.hide();
                        await fetchState();
                        drawAgents(state.agents);
                    }
                } catch (error) {
                    console.error('Erreur chargement preset:', error);
                }
            } else {
                alert('Veuillez sélectionner un preset');
            }
        });
    }
    
    // Sauvegarder (nouvel ID)
    const btnSave = document.getElementById('btnSaveConfigNew');
    if (btnSave) {
        btnSave.addEventListener('click', saveConfig);
    } else {
        console.warn('⚠️ btnSaveConfigNew non trouvé dans le DOM');
    }
    
    // Appliquer & Redémarrer (nouvel ID)
    const btnApply = document.getElementById('btnApplyConfigNew');
    if (btnApply) {
        btnApply.addEventListener('click', applyAndRestart);
    } else {
        console.warn('⚠️ btnApplyConfigNew non trouvé dans le DOM');
    }
    
    initSliders();
    initPresetPreview();
}

// ============================================================
// EXPOSER LES FONCTIONS NÉCESSAIRES
// ============================================================
window.loadPresets = loadPresets;
window.initConfigModal = initConfigModal;