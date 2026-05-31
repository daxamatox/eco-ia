// =========================================================
// CONSTANTES D'ÉQUIVALENCES
// =========================================================

const CO2_VOL_PARIS_NY_g = 170000;   // 170 kg CO2 Paris → NYC (ADEME)
const ELEC_FOYER_PAR_HEURE_Wh = 513.7; // 4500 kWh/an ÷ 8760h (Enedis)

// =========================================================
// FORMATAGE
// =========================================================

function formatCO2(grams) {
    if (grams < 0.001) return { val: (grams * 1000000).toFixed(1), unit: "µg" };
    if (grams < 1)     return { val: (grams * 1000).toFixed(2),    unit: "mg" };
    if (grams < 1000)  return { val: grams.toFixed(3),              unit: "g"  };
    return               { val: (grams / 1000).toFixed(4),          unit: "kg" };
}

function formatElec(Wh) {
    if (Wh < 1)    return { val: (Wh * 1000).toFixed(2), unit: "mWh" };
    if (Wh < 1000) return { val: Wh.toFixed(4),           unit: "Wh"  };
    return           { val: (Wh / 1000).toFixed(5),        unit: "kWh" };
}

function flightEquivalent(co2_grams) {
    const ratio = co2_grams / CO2_VOL_PARIS_NY_g;
    if (ratio < 0.000001) return `< 0.0001% d'un vol Paris → NYC`;
    if (ratio < 0.01)     return `${(ratio * 100).toFixed(6)}% d'un vol Paris → NYC`;
    if (ratio < 1)        return `${(ratio * 100).toFixed(4)}% d'un vol Paris → NYC`;
    return                  `${ratio.toFixed(2)}× vol Paris → NYC`;
}

function householdEquivalent(Wh) {
    const minutes = (Wh / ELEC_FOYER_PAR_HEURE_Wh) * 60;
    if (minutes < 0.001) return `< 0.001 sec. d'un foyer français`;
    if (minutes < 1)     return `${(minutes * 60).toFixed(3)} sec. d'un foyer français`;
    if (minutes < 60)    return `${minutes.toFixed(4)} min. d'un foyer français`;
    return                 `${(minutes / 60).toFixed(5)} h d'un foyer français`;
}

// =========================================================
// MISE À JOUR DE L'AFFICHAGE
// =========================================================

function updateDisplay() {
    chrome.storage.local.get(['requetesCount', 'totalEnergy', 'totalCO2', 'dernierModele', 'derniereZone', 'derniereCI'], function(data) {
        const energyWh = data.totalEnergy || 0;
        const co2Grams = data.totalCO2 || 0;
        const count    = data.requetesCount || 0;
        const ci       = data.derniereCI || 436;

        const co2Fmt  = formatCO2(co2Grams);
        const elecFmt = formatElec(energyWh);

        // Zone : afficher le nom ou "Détection..." si pas encore connu
        let zone = (data.derniereZone || "").trim();
        if (zone.includes('(')) zone = zone.split('(')[0].trim();
        const zoneOk = zone.length > 0 && zone !== "Détection...";

        document.getElementById('co2Value').innerText   = co2Fmt.val;
        document.getElementById('co2Unit').innerText    = co2Fmt.unit;
        document.getElementById('elecValue').innerText  = elecFmt.val;
        document.getElementById('elecUnit').innerText   = elecFmt.unit;
        document.getElementById('region').innerText     = zoneOk ? zone : "Détection...";
        document.getElementById('ciValue').innerText    = zoneOk ? `${ci} gCO₂/kWh` : "—";
        document.getElementById('modeleTxt').innerText  = data.dernierModele || "Aucun";
        document.getElementById('countDisplay').innerText = count;

        document.getElementById('flightEquiv').innerText    = flightEquivalent(co2Grams);
        document.getElementById('householdEquiv').innerText = householdEquivalent(energyWh);
    });
}

// =========================================================
// INIT
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();

    document.getElementById('reset').addEventListener('click', function() {
        if (confirm("Réinitialiser toutes vos statistiques ?")) {
            chrome.storage.local.set({
                requetesCount: 0,
                totalEnergy:   0,
                totalCO2:      0,
                dernierModele: "Aucun",
                derniereZone:  "",
                derniereCI:    436
            }, updateDisplay);
        }
    });
});
