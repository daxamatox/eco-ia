# 🌱 Eco-IA Tracker — Extension Chrome pour Gemini

Extension Chrome qui mesure en temps réel l'**impact carbone** et la **consommation électrique** de chaque requête envoyée à Gemini (Google AI Studio / gemini.google.com).

---

## 🗂️ Structure des fichiers

```
eco-ia/
├── manifest.json   → Configuration de l'extension Chrome
├── inject.js       → Injecté dans la page web (monde "MAIN") — détecte la localisation et intercepte les requêtes
├── content.js      → Script de contenu — calcule l'impact et sauvegarde dans le storage
├── popup.html      → Interface utilisateur de l'extension
├── popup.js        → Logique d'affichage du popup

```

---

## ⚙️ Comment ça marche — étape par étape

### 1. Détection de la localisation (`inject.js`)

À l'ouverture de gemini.google.com, `inject.js` est injecté directement dans le contexte de la page (monde `MAIN`, pas le contexte isolé de l'extension).

Il lit la **timezone du navigateur** via l'API standard JavaScript :
```javascript
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
// ex: "Europe/Paris"
```

Cette timezone est mappée vers un **code IATA d'aéroport** (ex: `Europe/Paris` → `CDG`) qui représente le datacenter Google le plus proche de l'utilisateur. Le raisonnement : Gemini route les requêtes vers le datacenter Google géographiquement le plus proche.

> **Pourquoi pas le header CF-Ray ?**  
> L'approche initiale du projet lisait le header `cf-ray` des réponses HTTP, qui est utilisé par Cloudflare et contient un code IATA. Mais Gemini tourne sur l'infrastructure Google directement — pas Cloudflare — donc ce header n'est jamais présent. La timezone est une alternative fiable et sans permission supplémentaire.

Une fois la timezone résolue, un événement personnalisé est dispatché vers `content.js` :
```javascript
window.dispatchEvent(new CustomEvent('EcoIA_ZoneDetected', {
    detail: { code: 'CDG', source: 'timezone' }
}));
```

`inject.js` intercepte aussi les réponses fetch de Gemini pour estimer le nombre de **tokens en sortie** (taille de la réponse ÷ 4).

---

### 2. Mapping IATA → Région GCP → Intensité Carbone (`content.js`)

Le code IATA reçu est cherché dans un dictionnaire de **354 codes IATA** construit en croisant deux sources :

- **`data.js`** (fichier original du projet) : liste des codes IATA avec noms de villes
- **`2024.csv`** : données officielles Google Cloud Carbon Footprint, une valeur de CO₂ par région GCP

```javascript
"CDG": { nom: "Paris", region: "europe-west9", ci: 16.30 }
// → datacenter de Paris, région GCP europe-west9, 16.30 gCO₂eq/kWh (grâce au nucléaire)

"FRA": { nom: "Francfort", region: "europe-west3", ci: 275.82 }
// → datacenter de Francfort, 275.82 gCO₂eq/kWh (mix énergétique allemand)
```

Le CI (Carbon Intensity) représente la quantité de CO₂ produite pour générer 1 kWh d'électricité dans cette région, en grammes.

---

### 3. Les formules de calcul

Pour chaque message envoyé, deux formules sont appliquées :

**Formule 1 — Énergie totale consommée (en Wh) :**
```
E_totale = (N_tokens_input × E_input + N_tokens_output × E_output) × PUE
```

**Formule 2 — Émissions CO₂ (en grammes) :**
```
CO₂ = (E_totale / 1000) × CI_régional
```

#### Variables :

| Variable | Valeur | Source |
|---|---|---|
| `N_tokens_input` | `longueur_prompt ÷ 4` | Convention NLP (~4 chars/token) |
| `N_tokens_output` | Lu depuis la réponse HTTP ou `N_input × 1.5` | inject.js |
| `E_input` | `0.0000008 Wh/token` (Flash) | Littérature LLM |
| `E_output` | `0.0000016 Wh/token` (Flash) | Decode ≈ 2× prefill |
| `PUE` | `1.1` | Google Sustainability Report 2024 |
| `CI_régional` | Variable selon région (gCO₂/kWh) | Google Cloud 2024.csv |

> Le **PUE** (Power Usage Effectiveness) est le coefficient d'efficacité du datacenter. Google affiche un PUE moyen de 1.1, ce qui signifie que pour 1 Wh utile au GPU, le datacenter consomme 1.1 Wh au total (refroidissement, pertes électriques inclus).

> Le **decode** (génération des tokens de sortie) consomme environ 2× plus d'énergie par token que le **prefill** (traitement du prompt en entrée)

#### Exemple concret (Paris) :
```
Prompt de 200 chars → ~50 tokens input
Réponse de 600 chars → ~150 tokens output
PUE = 1.1, CI Paris = 16.30 gCO₂/kWh

E = (50 × 0.0000008 + 150 × 0.0000016) × 1.1
  = (0.00004 + 0.00024) × 1.1
  = 0.000308 Wh

CO₂ = (0.000308 / 1000) × 16.30 = 0.000005 g ≈ 5 µg
```

---

### 4. Interception des messages (`content.js`)

`content.js` écoute deux types d'événements sur la page Gemini :

- **Touche `Entrée`** sans Shift
- **Clic sur le bouton Envoyer** (`aria-label="Envoyer"` ou `"Send"`)

À chaque envoi, il lit le contenu de la zone de saisie (`contenteditable` ou `textarea`), attend 600ms (le temps que la réponse commence à arriver), puis déclenche le calcul.

---

### 5. Stockage et affichage (`popup.js` + `popup.html`)

Les données sont cumulées dans `chrome.storage.local` :

```javascript
{
    totalEnergy:   0.00123,   // Wh cumulés
    totalCO2:      0.00456,   // grammes CO₂ cumulés
    requetesCount: 7,          // nombre de messages envoyés
    dernierModele: "Gemini Flash",
    derniereZone:  "Paris",
    derniereCI:    16.30
}
```

Le popup affiche ces valeurs avec deux équivalences pédagogiques :

| Équivalence | Base de calcul |
|---|---|
| ✈️ Vol Paris → New York | 170 kg CO₂/passager (source ADEME) |
| 🏠 Foyer français alimenté | 4 500 kWh/an = 513.7 Wh/heure (source Enedis) |

---

## 📊 Source des données CI

Le fichier `2024.csv` provient du programme **Google Cloud Carbon Footprint**, qui publie chaque année les émissions réelles par région. Les valeurs varient énormément selon le mix énergétique local :

| Région | Datacenter | CI (gCO₂/kWh) | Pourquoi |
|---|---|---|---|
| `europe-west9` | Paris | **16.30** | Nucléaire français |
| `europe-north2` | Stockholm | **2.73** | Hydroélectrique nordique |
| `europe-west3` | Francfort | **275.82** | Mix charbon/gaz allemand |
| `europe-central2` | Varsovie | **642.88** | Charbon polonais |
| `asia-south1` | Mumbai | **678.76** | Charbon indien |
| `africa-south1` | Johannesburg | **656.85** | Charbon sud-africain |

---

## 🚀 Installation

1. Télécharger et dézipper le projet
2. Ouvrir Chrome → `chrome://extensions`
3. Activer le **Mode développeur** (en haut à droite)
4. Cliquer **"Charger l'extension non empaquetée"**
5. Sélectionner le dossier `eco-ia-v2/`
6. Ouvrir [gemini.google.com](https://gemini.google.com) et envoyer un message

---

## 🔒 Permissions utilisées

| Permission | Raison |
|---|---|
| `storage` | Sauvegarder les statistiques cumulées entre sessions |

Aucune donnée n'est envoyée à un serveur externe. Tout est calculé localement.
