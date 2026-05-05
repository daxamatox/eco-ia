// =========================================================
// 1. GESTION DE LA LOCALISATION UTILISATEUR
// =========================================================

function setupUserLocation() {
    const select = document.getElementById('userCitySelect');
    if (!select) return;

    // Remplissage du menu avec le dictionnaire 'airports' (issu de data.js)
    // On trie par nom de ville (valeur) plutôt que par code IATA
    const entries = Object.entries(airports).sort((a, b) => a[1].localeCompare(b[1]));
    
    entries.forEach(([code, name]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        select.appendChild(option);
    });

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
    chrome.storage.local.get(['totalTokens', 'totalEnergy', 'dernierModele', 'derniereZone'], function(data) {
        // Récupération de l'énergie en Wh (calculée dans content.js)
        const energyWh = data.totalEnergy || 0;
        const co2mg = data.totalTokens || 0;

        // Calcul de l'eau : ~0.5ml par Wh consommé
        // On affiche en Litres dans ton HTML (donc / 1000)
        const eauLitres = (energyWh * 0.5) / 1000;
        
        // Conversion Wh en kWh pour l'affichage
        const elecKWh = energyWh / 1000;

        // Mise à jour du DOM
        document.getElementById('eau').innerText = eauLitres.toFixed(3);
        document.getElementById('elec').innerText = elecKWh.toFixed(5);
        document.getElementById('region').innerText = data.derniereZone || "Détection...";
        document.getElementById('modeleTxt').innerText = data.dernierModele || "Aucun";
    });
}

// =========================================================
// 3. INITIALISATION ET ÉVÉNEMENTS
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    setupUserLocation();
    updateDisplay();
});

// Bouton Réinitialiser
document.getElementById('reset').addEventListener('click', function() {
    if (confirm("Voulez-vous vraiment réinitialiser toutes vos statistiques ?")) {
        chrome.storage.local.set({ 
            totalTokens: 0, 
            totalEnergy: 0, 
            dernierModele: "Réinitialisé" 
        }, () => {
            updateDisplay();
        });
    }
});