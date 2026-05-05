// =========================================================
// 1. CONFIGURATION ET VARIABLES GLOBALES
// =========================================================

let currentServerZone = "Zone inconnue";
let currentIntensity = 475; // Moyenne mondiale par défaut (gCO2/kWh)

// Table des intensités carbone (Source: Electricity Maps / Moyennes 2024)
const CARBON_INTENSITY = {
    "France": 55,           // Très bas (Nucléaire)
    "United States": 380,    // Moyen/Haut (Dépend des états)
    "Netherlands": 300,     // Hub Amsterdam (AMS)
    "Germany": 350,         // Mixte
    "Ireland": 320,         // Hub Dublin
    "Belgium": 150,         // Souvent utilisé par Google
    "United Kingdom": 250,
    "Default": 475          // Moyenne mondiale
};

// Écoute du signal envoyé par inject.js (pour la zone du serveur)
window.addEventListener('EcoIA_ZoneDetected', (e) => {
    currentServerZone = e.detail.name;
    
    // Mise à jour de l'intensité basée sur le pays détecté
    let found = false;
    for (let country in CARBON_INTENSITY) {
        if (currentServerZone.includes(country)) {
            currentIntensity = CARBON_INTENSITY[country];
            found = true;
            break;
        }
    }
    if (!found) currentIntensity = CARBON_INTENSITY["Default"];
    
    console.log(`[Eco-IA] Serveur détecté : ${currentServerZone} (${currentIntensity}g/kWh)`);
});

// =========================================================
// 2. DÉTECTION DU MODÈLE (IA)
// =========================================================

async function getModelMultiplier() {
    const url = window.location.href;
    const rawHTML = document.body.innerHTML;

    // --- CAS GEMINI ---
    if (url.includes("gemini.google.com")) {
        // Fallback zone pour Google (souvent Belgique ou Pays-Bas en Europe)
        if (currentServerZone === "Zone inconnue") {
            currentServerZone = "Google Data Center (Europe)";
            currentIntensity = 250; 
        }
        if (rawHTML.includes(">Raisonnement<")) return { nom: "RAISONNEMENT (Lourd)", mult: 15.0 };
        if (rawHTML.includes(">Pro<")) return { nom: "PRO (Gemini 1.5 Pro)", mult: 5.0 };
        return { nom: "Gemini Standard", mult: 1.0 };
    }

    // --- CAS CHATGPT ---
    if (url.includes("chatgpt.com")) {
        const target = document.querySelector('button[aria-haspopup="menu"]') || 
                       document.querySelector('button:has(use)');

        if (target) {
            // Simulation du hover pour forcer l'affichage du tooltip Radix
            target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(r => setTimeout(r, 150)); // Attente apparition
            const tooltip = document.querySelector('[data-radix-popper-content-wrapper]');
            
            if (tooltip) {
                const txt = tooltip.innerText;
                target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

                if (txt.includes("Thinking")) return { nom: "GPT-5 THINKING", mult: 15.0 };
                if (txt.includes("Mini")) return { nom: "GPT-5 MINI", mult: 2.0 };
            }
        }
        // Secours si le hover échoue
        if (rawHTML.includes("Used GPT-5 Thinking Mini")) return { nom: "GPT-5 THINKING", mult: 15.0 };
        return { nom: "ChatGPT Standard", mult: 1.5 };
    }

    return { nom: "Modèle Standard", mult: 1.0 };
}

// =========================================================
// 3. CALCUL SCIENTIFIQUE ET SAUVEGARDE
// =========================================================

async function saveImpact(promptText) {
    if (!promptText || promptText.trim().length === 0) return;

    const stats = await getModelMultiplier();
    
    // 1. Calcul de l'énergie brute (Wh)
    // 0.000002 kWh = 0.002 Wh par caractère
    const energyWh = (promptText.length * stats.mult * 0.002);
    
    // 2. Calcul du CO2 (mg) basé sur l'intensité du serveur détecté
    const calculatedCO2mg = energyWh * currentIntensity; 

    chrome.storage.local.get(['totalTokens', 'totalEnergy'], function(result) {
        const nouveauCO2 = (result.totalTokens || 0) + calculatedCO2mg;
        const nouvelleEnergie = (result.totalEnergy || 0) + energyWh;
        
        chrome.storage.local.set({ 
            totalTokens: nouveauCO2,      // Stocké en mg
            totalEnergy: nouvelleEnergie, // Stocké en Wh
            dernierModele: stats.nom,
            derniereZone: currentServerZone
        }, function() {
            console.log(`[Eco-IA] +${calculatedCO2mg.toFixed(0)}mg CO2 | ${energyWh.toFixed(3)}Wh | Zone: ${currentServerZone}`);
        });
    });
}

// =========================================================
// 4. INTERCEPTION DES ÉVÉNEMENTS UTILISATEUR
// =========================================================

function getInputText() {
    const zone = document.querySelector('#prompt-textarea') || 
                 document.querySelector('textarea') || 
                 document.querySelector('[contenteditable="true"]');
    return zone ? (zone.value || zone.innerText) : null;
}

// Détection via la touche Entrée
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        const text = getInputText();
        if (text) setTimeout(() => saveImpact(text), 600);
    }
}, true);

// Détection via le clic sur le bouton d'envoi
document.addEventListener('click', function(event) {
    const isSendBtn = event.target.closest('button[data-testid="send-button"]') || 
                      event.target.closest('button[aria-label*="Envoyer"]');
    
    if (isSendBtn) {
        const text = getInputText();
        if (text) setTimeout(() => saveImpact(text), 600);
    }
}, true);