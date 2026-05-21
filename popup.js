// =========================================================
// 1. GESTION DE LA LOCALISATION UTILISATEUR
// =========================================================

function setupUserLocation() {
    const select = document.getElementById('userCitySelect');
    if (!select) return;

    // Remplissage du menu avec le dictionnaire 'airports' (issu de data.js)
    if (typeof airports !== 'undefined') {
        const entries = Object.entries(airports).sort((a, b) => a[1].localeCompare(b[1]));
        entries.forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    // Charger la ville déjà sauvegardée par l'utilisateur
    chrome.storage.local.get(['userCityCode'], (res) => {
        if (res.userCityCode) {
            select.value = res.userCityCode;
        }
    });

    // Sauvegarder le choix lors d'un changement
    select.addEventListener('change', (e) => {
        const selectedCode = e.target.value;
        chrome.storage.local.set({ userCityCode: selectedCode });
    });
}

// =========================================================
// 2. MISE À JOUR DE L'AFFICHAGE DES STATS
// =========================================================

function updateDisplay() {
    // CORRECTION : On demande 'requetesCount' à la place de 'totalTokens'
    chrome.storage.local.get(['requetesCount', 'totalEnergy', 'dernierModele', 'derniereZone'], function(data) {
        // Récupération des valeurs du stockage local
        const energyWh = data.totalEnergy || 0;
        const count = data.requetesCount || 0; // Récupère le vrai compteur de content.js
        
        // Calcul de l'eau : ~0.5ml par Wh consommé -> affichage en Litres (/ 1000)
        const eauLitres = (energyWh * 0.5) / 1000;
        
        // Conversion Wh en kWh pour l'affichage
        const elecKWh = energyWh / 1000;

        // --- NETTOYAGE DU TEXTE DU SERVEUR ---
        let zoneBrute = data.derniereZone || "Détection...";
        if (zoneBrute.includes('(')) {
            zoneBrute = zoneBrute.split('(')[0].trim();
        }

        // Mise à jour du DOM
        document.getElementById('eau').innerText = eauLitres.toFixed(3);
        document.getElementById('elec').innerText = elecKWh.toFixed(5);
        document.getElementById('region').innerText = zoneBrute;
        document.getElementById('modeleTxt').innerText = data.dernierModele || "Aucun";
        
        // CORRECTION : On injecte la valeur dans l'élément HTML id="countDisplay"
        const countElem = document.getElementById('countDisplay');
        if (countElem) {
            countElem.innerText = count;
        }
    });
}

// =========================================================
// 3. INITIALISATION ET ÉVÉNEMENTS
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialiser l'interface
    setupUserLocation();
    updateDisplay();

    // 2. Configurer le Bouton Réinitialiser
    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm("Voulez-vous vraiment réinitialiser toutes vos statistiques ?")) {
                // CORRECTION : On remet 'requetesCount' à 0 lors du reset
                chrome.storage.local.set({ 
                    requetesCount: 0, 
                    totalEnergy: 0, 
                    dernierModele: "Aucun",
                    derniereZone: "Détection..."
                }, () => {
                    updateDisplay();
                });
            }
        });
    }
});
