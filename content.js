// =========================================================
// 1. CONFIGURATION ET VARIABLES GLOBALES
// =========================================================

let currentServerZone = "Zone inconnue";
let currentIntensity = 475; // Moyenne mondiale par défaut (gCO2/kWh)

const CARBON_INTENSITY = {
    "CDG": { nom: "Paris", carbon: 55 },       // France : Nucléaire + Renouvelable
    "FRA": { nom: "Francfort", carbon: 350 },  // Allemagne : Charbon + Renouvelable
    "AMS": { nom: "Amsterdam", carbon: 250 },  // Pays-Bas : Gaz + Forte hausse Éolien
    "BRU": { nom: "Bruxelles", carbon: 150 },  // Belgique : Nucléaire + Éolien
    "DUB": { nom: "Dublin", carbon: 330 },     // Irlande : Éolien + Fort backup Gaz
    "LHR": { nom: "Londres", carbon: 210 },    // Royaume-Uni : Éolien offshore dominant
    "IAD": { nom: "Virginie", carbon: 380 }    // États-Unis (Hub Google Est) : Mix national moyen
};

window.addEventListener('EcoIA_ZoneDetected', (e) => {
    const code = e.detail.code; // On récupère directement "FRA", "CDG", etc.
    
    // Accès direct au dictionnaire
    if (CARBON_INTENSITY[code]) {
        currentServerZone = CARBON_INTENSITY[code].nom;
        currentIntensity = CARBON_INTENSITY[code].carbon;
    } else {
        currentServerZone = `Hub Google (${code})`;
        currentIntensity = 480; // Moyenne mondiale si code inconnu
    }
    
    console.log(`[Eco-IA] Serveur détecté : ${currentServerZone} (${currentIntensity}g/kWh)`);
});

// =========================================================
// 2. DÉTECTION DU MODÈLE (IA) - SÉCURISÉ GEMINI
// =========================================================

async function getModelMultiplier() {
    // On cible le span qui contient le nom du modèle
    // On cherche les éléments qui contiennent la classe "picker-primary-text" ou qui sont dans un bouton
    const modelSpan = document.querySelector('span.picker-primary-text') || 
                      document.querySelector('[data-testid="model-selector"] span');

    const modelName = modelSpan ? modelSpan.innerText : "";
    
    console.log("[Eco-IA] Modèle détecté dans le span :", modelName);

    if (modelName.includes("Pro")) {
        return { nom: "PRO (Gemini 1.5 Pro)", mult: 10.0 };
    }
    if (modelName.includes("Flash-Lite")) {
        return { nom: "Flash-Lite (Léger)", mult: 1.0 };
    }
    if (modelName.includes("Flash")) {
        return { nom: "Flash (Moyen)", mult: 5.0 };
    }
    
    return { nom: "Gemini Standard", mult: 1.0 };
}

// =========================================================
// 3. CALCUL SCIENTIFIQUE ET SAUVEGARDE
// =========================================================

async function saveImpact(promptText) {
    if (!promptText || promptText.trim().length === 0) return;

    const stats = await getModelMultiplier();
    
    // Calcul de l'énergie brute (Wh) basé sur la taille du texte
    const energyWh = (promptText.length * stats.mult * 0.002);
    const calculatedCO2mg = energyWh * currentIntensity; 

    // Récupération et séparation des trois variables pour éviter les conflits
    chrome.storage.local.get(['totalTokens', 'totalEnergy', 'requetesCount'], function(result) {
        const nouveauCO2 = (result.totalTokens || 0) + calculatedCO2mg;
        const nouvelleEnergie = (result.totalEnergy || 0) + energyWh;
        const nouveauCount = (result.requetesCount || 0) + 1; // Un vrai +1 par envoi !

        chrome.storage.local.set({ 
            totalTokens: nouveauCO2,       // CO2 total en mg
            totalEnergy: nouvelleEnergie,   // Énergie totale en Wh
            requetesCount: nouveauCount,   // Compteur de requêtes propre
            dernierModele: stats.nom,
            derniereZone: currentServerZone
        }, function() {
            console.log(`[Eco-IA] +${calculatedCO2mg.toFixed(0)}mg CO2 | ${energyWh.toFixed(3)}Wh | Requête n°${nouveauCount}`);
        });
    });
}

// =========================================================
// 4. INTERCEPTION DES ÉVÉNEMENTS UTILISATEUR (ZÉRO TEXTAREA CHATGPT)
// =========================================================

function getInputText() {
    // Ciblage exclusif de la boîte de texte editable de Gemini
    const zone = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
    return zone ? (zone.value || zone.innerText) : null;
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        const text = getInputText();
        if (text) setTimeout(() => saveImpact(text), 600);
    }
}, true);

document.addEventListener('click', function(event) {
    const isSendBtn = event.target.closest('button[aria-label*="Envoyer"]') || 
                      event.target.closest('button[aria-label*="Send"]');
    
    if (isSendBtn) {
        const text = getInputText();
        if (text) setTimeout(() => saveImpact(text), 600);
    }
}, true);