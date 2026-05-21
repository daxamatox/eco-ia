// =========================================================
// 1. MISE À JOUR DE L'AFFICHAGE DES STATS
// =========================================================

function updateDisplay() {
    chrome.storage.local.get(['requetesCount', 'totalEnergy', 'dernierModele', 'derniereZone'], function(data) {
        // Récupération des valeurs du stockage local
        const energyWh = data.totalEnergy || 0;
        const count = data.requetesCount || 0;
        
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
        
        const countElem = document.getElementById('countDisplay');
        if (countElem) {
            countElem.innerText = count;
        }
    });
}

// =========================================================
// 2. INITIALISATION ET ÉVÉNEMENTS
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser l'interface
    updateDisplay();

    // Configurer le Bouton Réinitialiser
    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm("Voulez-vous vraiment réinitialiser toutes vos statistiques ?")) {
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