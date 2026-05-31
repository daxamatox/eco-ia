// =========================================================
// 1. CONFIGURATION ET VARIABLES GLOBALES
// =========================================================

let currentServerZone = "Détection...";
let currentIntensity = 436; // Moyenne mondiale Google 2024 (gCO2eq/kWh)
let lastOutputTokens = 0;

// =========================================================
// MAPPING IATA → RÉGION GOOGLE CLOUD → CI (gCO2eq/kWh)
// Construit depuis data.js (codes IATA) × 2024.csv (valeurs CI)
// Le header CF-Ray de Cloudflare contient le code IATA du datacenter
// =========================================================
// Mapping complet IATA → Région GCP → CI (gCO2eq/kWh)
// Source CI : Google Cloud Carbon Footprint Data 2024
// 354 codes IATA couverts — croisement data.js + 2024.csv
const IATA_TO_GCP = {
  "AAE": { nom: "Annaba", region: "europe-southwest1", ci: 89.04 },
  "ABJ": { nom: "Abidjan", region: "africa-south1", ci: 656.85 },
  "ABQ": { nom: "Albuquerque", region: "us-west3", ci: 555.17 },
  "ACC": { nom: "Accra", region: "africa-south1", ci: 656.85 },
  "ACX": { nom: "Xingyi", region: "asia-east1", ci: 439.29 },
  "ADB": { nom: "Izmir", region: "europe-west3", ci: 275.82 },
  "ADD": { nom: "Addis-Abeba", region: "africa-south1", ci: 656.85 },
  "ADL": { nom: "Adelaide", region: "australia-southeast2", ci: 454.37 },
  "AGR": { nom: "Agra", region: "asia-south1", ci: 678.76 },
  "AKL": { nom: "Auckland", region: "australia-southeast1", ci: 497.5 },
  "AKX": { nom: "Aktobe", region: "asia-south2", ci: 531.83 },
  "ALA": { nom: "Almaty", region: "asia-south2", ci: 531.83 },
  "ALG": { nom: "Alger", region: "europe-southwest1", ci: 89.04 },
  "AMD": { nom: "Ahmedabad", region: "asia-south1", ci: 678.76 },
  "AMM": { nom: "Amman", region: "me-west1", ci: 433.75 },
  "AMS": { nom: "Amsterdam", region: "europe-west4", ci: 208.81 },
  "ANC": { nom: "Anchorage", region: "us-west1", ci: 79.23 },
  "ARI": { nom: "Arica", region: "southamerica-west1", ci: 238.0 },
  "ARN": { nom: "Stockholm", region: "europe-north2", ci: 2.73 },
  "ARU": { nom: "Aracatuba", region: "southamerica-east1", ci: 67.32 },
  "ASK": { nom: "Yamoussoukro", region: "africa-south1", ci: 656.85 },
  "ASU": { nom: "Asunción", region: "southamerica-east1", ci: 67.32 },
  "ATH": { nom: "Athènes", region: "europe-southwest1", ci: 89.04 },
  "ATL": { nom: "Atlanta", region: "us-east2", ci: 340.42 },
  "AUS": { nom: "Austin", region: "us-south1", ci: 302.95 },
  "BAH": { nom: "Manama", region: "me-central2", ci: 382.23 },
  "BAQ": { nom: "Barranquilla", region: "northamerica-south1", ci: 305.0 },
  "BBI": { nom: "Bhubaneswar", region: "asia-south1", ci: 678.76 },
  "BCN": { nom: "Barcelone", region: "europe-southwest1", ci: 89.04 },
  "BEG": { nom: "Belgrade", region: "europe-central2", ci: 642.88 },
  "BEL": { nom: "Belém", region: "southamerica-east1", ci: 67.32 },
  "BEY": { nom: "Beyrouth", region: "me-west1", ci: 433.75 },
  "BGI": { nom: "Bridgetown", region: "us-east1", ci: 575.77 },
  "BGR": { nom: "Bangor", region: "us-east4", ci: 323.05 },
  "BGW": { nom: "Bagdad", region: "me-central1", ci: 366.0 },
  "BHY": { nom: "Beihai", region: "asia-east1", ci: 439.29 },
  "BKK": { nom: "Bangkok", region: "asia-southeast1", ci: 366.85 },
  "BLR": { nom: "Bangalore", region: "asia-south1", ci: 678.76 },
  "BNA": { nom: "Nashville", region: "us-east2", ci: 340.42 },
  "BNE": { nom: "Brisbane", region: "australia-southeast1", ci: 497.5 },
  "BNU": { nom: "Blumenau", region: "southamerica-east1", ci: 67.32 },
  "BOD": { nom: "Bordeaux", region: "europe-west9", ci: 16.3 },
  "BOG": { nom: "Bogota", region: "northamerica-south1", ci: 305.0 },
  "BOM": { nom: "Mumbai", region: "asia-south1", ci: 678.76 },
  "BOS": { nom: "Boston", region: "us-east4", ci: 323.05 },
  "BRU": { nom: "Bruxelles", region: "europe-west1", ci: 103.37 },
  "BSB": { nom: "Brasilia", region: "southamerica-east1", ci: 67.32 },
  "BSR": { nom: "Bassora", region: "me-central1", ci: 366.0 },
  "BTS": { nom: "Bratislava", region: "europe-west3", ci: 275.82 },
  "BUD": { nom: "Budapest", region: "europe-west3", ci: 275.82 },
  "BUF": { nom: "Buffalo", region: "us-east5", ci: 323.05 },
  "BWN": { nom: "Bandar Seri Begawan", region: "asia-southeast1", ci: 366.85 },
  "CAI": { nom: "Le Caire", region: "me-west1", ci: 433.75 },
  "CAN": { nom: "Guangzhou", region: "asia-east1", ci: 439.29 },
  "CAW": { nom: "Campos", region: "southamerica-east1", ci: 67.32 },
  "CBR": { nom: "Canberra", region: "australia-southeast1", ci: 497.5 },
  "CCP": { nom: "Concepción", region: "southamerica-west1", ci: 238.0 },
  "CCU": { nom: "Kolkata", region: "asia-south1", ci: 678.76 },
  "CDG": { nom: "Paris", region: "europe-west9", ci: 16.3 },
  "CEB": { nom: "Cebu", region: "asia-southeast1", ci: 366.85 },
  "CFC": { nom: "Cacador", region: "southamerica-east1", ci: 67.32 },
  "CGB": { nom: "Cuiaba", region: "southamerica-east1", ci: 67.32 },
  "CGD": { nom: "Changde", region: "asia-east1", ci: 439.29 },
  "CGK": { nom: "Jakarta", region: "asia-southeast2", ci: 560.55 },
  "CGO": { nom: "Zhengzhou", region: "asia-east1", ci: 439.29 },
  "CGP": { nom: "Chittagong", region: "asia-south1", ci: 678.76 },
  "CGY": { nom: "Cagayan de Oro", region: "asia-southeast1", ci: 366.85 },
  "CHC": { nom: "Christchurch", region: "australia-southeast1", ci: 497.5 },
  "CJB": { nom: "Coimbatore", region: "asia-south1", ci: 678.76 },
  "CKG": { nom: "Chongqing", region: "asia-east1", ci: 439.29 },
  "CLE": { nom: "Cleveland", region: "us-east5", ci: 323.05 },
  "CLO": { nom: "Cali", region: "northamerica-south1", ci: 305.0 },
  "CLT": { nom: "Charlotte", region: "us-east2", ci: 340.42 },
  "CMB": { nom: "Colombo", region: "asia-south1", ci: 678.76 },
  "CMH": { nom: "Columbus", region: "us-east5", ci: 323.05 },
  "CMN": { nom: "Casablanca", region: "europe-southwest1", ci: 89.04 },
  "CNF": { nom: "Belo Horizonte", region: "southamerica-east1", ci: 67.32 },
  "CNN": { nom: "Kannur", region: "asia-south1", ci: 678.76 },
  "CNX": { nom: "Chiang Mai", region: "asia-southeast1", ci: 366.85 },
  "COK": { nom: "Kochi", region: "asia-south1", ci: 678.76 },
  "COR": { nom: "Córdoba", region: "southamerica-east1", ci: 67.32 },
  "CPH": { nom: "Copenhague", region: "europe-north1", ci: 39.32 },
  "CPT": { nom: "Le Cap", region: "africa-south1", ci: 656.85 },
  "CRK": { nom: "Tarlac", region: "asia-southeast1", ci: 366.85 },
  "CSX": { nom: "Changsha", region: "asia-east1", ci: 439.29 },
  "CTU": { nom: "Chengdu", region: "asia-east1", ci: 439.29 },
  "CWB": { nom: "Curitiba", region: "southamerica-east1", ci: 67.32 },
  "CZL": { nom: "Constantine", region: "europe-southwest1", ci: 89.04 },
  "CZX": { nom: "Changzhou", region: "asia-east1", ci: 439.29 },
  "DAC": { nom: "Dhaka", region: "asia-south1", ci: 678.76 },
  "DAD": { nom: "Da Nang", region: "asia-southeast1", ci: 366.85 },
  "DAR": { nom: "Dar es Salaam", region: "africa-south1", ci: 656.85 },
  "DCA": { nom: "Washington DC", region: "us-east4", ci: 323.05 },
  "DEL": { nom: "New Delhi", region: "asia-south2", ci: 531.83 },
  "DEN": { nom: "Denver", region: "us-west3", ci: 555.17 },
  "DFW": { nom: "Dallas", region: "us-south1", ci: 302.95 },
  "DKR": { nom: "Dakar", region: "africa-south1", ci: 656.85 },
  "DLC": { nom: "Dalian", region: "asia-east1", ci: 439.29 },
  "DME": { nom: "Moscou", region: "europe-central2", ci: 642.88 },
  "DMM": { nom: "Dammam", region: "me-central2", ci: 382.23 },
  "DOH": { nom: "Doha", region: "me-central1", ci: 366.0 },
  "DPS": { nom: "Bali", region: "asia-southeast2", ci: 560.55 },
  "DTW": { nom: "Detroit", region: "us-east5", ci: 323.05 },
  "DUB": { nom: "Dublin", region: "europe-west1", ci: 103.37 },
  "DUR": { nom: "Durban", region: "africa-south1", ci: 656.85 },
  "DUS": { nom: "Düsseldorf", region: "europe-west3", ci: 275.82 },
  "DXB": { nom: "Dubaï", region: "me-central1", ci: 366.0 },
  "EBB": { nom: "Kampala", region: "africa-south1", ci: 656.85 },
  "EBL": { nom: "Erbil", region: "me-central1", ci: 366.0 },
  "EDI": { nom: "Édimbourg", region: "europe-west2", ci: 105.94 },
  "EVN": { nom: "Erevan", region: "me-west1", ci: 433.75 },
  "EWR": { nom: "Newark", region: "us-east4", ci: 323.05 },
  "EZE": { nom: "Buenos Aires", region: "southamerica-east1", ci: 67.32 },
  "FCO": { nom: "Rome", region: "europe-west8", ci: 201.69 },
  "FIH": { nom: "Kinshasa", region: "africa-south1", ci: 656.85 },
  "FLN": { nom: "Florianopolis", region: "southamerica-east1", ci: 67.32 },
  "FOC": { nom: "Fuzhou", region: "asia-east1", ci: 439.29 },
  "FOR": { nom: "Fortaleza", region: "southamerica-east1", ci: 67.32 },
  "FRA": { nom: "Francfort", region: "europe-west3", ci: 275.82 },
  "FRU": { nom: "Bichkek", region: "asia-south2", ci: 531.83 },
  "FSD": { nom: "Sioux Falls", region: "us-central1", ci: 412.72 },
  "FUK": { nom: "Fukuoka", region: "asia-northeast1", ci: 452.85 },
  "FUO": { nom: "Foshan", region: "asia-east1", ci: 439.29 },
  "GBE": { nom: "Gaborone", region: "africa-south1", ci: 656.85 },
  "GDL": { nom: "Guadalajara", region: "northamerica-south1", ci: 305.0 },
  "GEO": { nom: "Georgetown", region: "southamerica-east1", ci: 67.32 },
  "GIG": { nom: "Rio de Janeiro", region: "southamerica-east1", ci: 67.32 },
  "GND": { nom: "St. George's", region: "us-east1", ci: 575.77 },
  "GOT": { nom: "Göteborg", region: "europe-north2", ci: 2.73 },
  "GRU": { nom: "São Paulo", region: "southamerica-east1", ci: 67.32 },
  "GUA": { nom: "Guatemala City", region: "northamerica-south1", ci: 305.0 },
  "GUM": { nom: "Guam", region: "asia-northeast1", ci: 452.85 },
  "GVA": { nom: "Genève", region: "europe-west6", ci: 15.05 },
  "GYD": { nom: "Bakou", region: "me-central1", ci: 366.0 },
  "GYE": { nom: "Guayaquil", region: "southamerica-west1", ci: 238.0 },
  "GYN": { nom: "Goiania", region: "southamerica-east1", ci: 67.32 },
  "HAK": { nom: "Haikou", region: "asia-east1", ci: 439.29 },
  "HAM": { nom: "Hamburg", region: "europe-west3", ci: 275.82 },
  "HAN": { nom: "Hanoi", region: "asia-southeast1", ci: 366.85 },
  "HBA": { nom: "Hobart", region: "australia-southeast1", ci: 497.5 },
  "HEL": { nom: "Helsinki", region: "europe-north1", ci: 39.32 },
  "HFA": { nom: "Haïfa", region: "me-west1", ci: 433.75 },
  "HFE": { nom: "Hefei", region: "asia-east1", ci: 439.29 },
  "HGH": { nom: "Hangzhou", region: "asia-east1", ci: 439.29 },
  "HKG": { nom: "Hong Kong", region: "asia-east2", ci: 505.02 },
  "HNL": { nom: "Honolulu", region: "us-west1", ci: 79.23 },
  "HRE": { nom: "Harare", region: "africa-south1", ci: 656.85 },
  "HYD": { nom: "Hyderabad", region: "asia-south1", ci: 678.76 },
  "HYN": { nom: "Taizhou", region: "asia-east1", ci: 439.29 },
  "IAD": { nom: "Virginie du Nord", region: "us-east4", ci: 323.05 },
  "IAH": { nom: "Houston", region: "us-south1", ci: 302.95 },
  "ICN": { nom: "Séoul", region: "asia-northeast3", ci: 356.57 },
  "IND": { nom: "Indianapolis", region: "us-east5", ci: 323.05 },
  "ISB": { nom: "Islamabad", region: "asia-south1", ci: 678.76 },
  "IST": { nom: "Istanbul", region: "europe-west3", ci: 275.82 },
  "ISU": { nom: "Sulaymaniyah", region: "me-central1", ci: 366.0 },
  "ITJ": { nom: "Itajai", region: "southamerica-east1", ci: 67.32 },
  "IXC": { nom: "Chandigarh", region: "asia-south1", ci: 678.76 },
  "JAX": { nom: "Jacksonville", region: "us-east1", ci: 575.77 },
  "JDO": { nom: "Juazeiro do Norte", region: "southamerica-east1", ci: 67.32 },
  "JED": { nom: "Djeddah", region: "me-central2", ci: 382.23 },
  "JFK": { nom: "New York", region: "us-east4", ci: 323.05 },
  "JHB": { nom: "Johor Bahru", region: "asia-southeast1", ci: 366.85 },
  "JIB": { nom: "Djibouti", region: "africa-south1", ci: 656.85 },
  "JNB": { nom: "Johannesburg", region: "africa-south1", ci: 656.85 },
  "JOG": { nom: "Yogyakarta", region: "asia-southeast2", ci: 560.55 },
  "JOI": { nom: "Joinville", region: "southamerica-east1", ci: 67.32 },
  "JSR": { nom: "Jashore", region: "asia-south1", ci: 678.76 },
  "JXG": { nom: "Jiaxing", region: "asia-east1", ci: 439.29 },
  "KBP": { nom: "Kyiv", region: "europe-central2", ci: 642.88 },
  "KCH": { nom: "Kuching", region: "asia-southeast1", ci: 366.85 },
  "KEF": { nom: "Reykjavik", region: "europe-north1", ci: 39.32 },
  "KGL": { nom: "Kigali", region: "africa-south1", ci: 656.85 },
  "KHH": { nom: "Kaohsiung", region: "asia-east1", ci: 439.29 },
  "KHI": { nom: "Karachi", region: "asia-south1", ci: 678.76 },
  "KHN": { nom: "Nanchang", region: "asia-east1", ci: 439.29 },
  "KIN": { nom: "Kingston", region: "us-east4", ci: 323.05 },
  "KIV": { nom: "Chișinău", region: "europe-central2", ci: 642.88 },
  "KIX": { nom: "Osaka", region: "asia-northeast2", ci: 296.19 },
  "KJA": { nom: "Krasnoïarsk", region: "asia-northeast1", ci: 452.85 },
  "KMG": { nom: "Kunming", region: "asia-east1", ci: 439.29 },
  "KNU": { nom: "Kanpur", region: "asia-south1", ci: 678.76 },
  "KTM": { nom: "Kathmandu", region: "asia-south1", ci: 678.76 },
  "KUL": { nom: "Kuala Lumpur", region: "asia-southeast1", ci: 366.85 },
  "KWE": { nom: "Guiyang", region: "asia-east1", ci: 439.29 },
  "KWI": { nom: "Koweït", region: "me-central2", ci: 382.23 },
  "LAD": { nom: "Luanda", region: "africa-south1", ci: 656.85 },
  "LAS": { nom: "Las Vegas", region: "us-west4", ci: 357.3 },
  "LAX": { nom: "Los Angeles", region: "us-west2", ci: 169.28 },
  "LCA": { nom: "Nicosie", region: "me-west1", ci: 433.75 },
  "LED": { nom: "Saint-Pétersbourg", region: "europe-north1", ci: 39.32 },
  "LHE": { nom: "Lahore", region: "asia-south1", ci: 678.76 },
  "LHR": { nom: "Londres", region: "europe-west2", ci: 105.94 },
  "LHW": { nom: "Lanzhou", region: "asia-east1", ci: 439.29 },
  "LIM": { nom: "Lima", region: "southamerica-west1", ci: 238.0 },
  "LIS": { nom: "Lisbonne", region: "europe-southwest1", ci: 89.04 },
  "LJU": { nom: "Ljubljana", region: "europe-west8", ci: 201.69 },
  "LLK": { nom: "Astara", region: "me-central1", ci: 366.0 },
  "LLW": { nom: "Lilongwe", region: "africa-south1", ci: 656.85 },
  "LOS": { nom: "Lagos", region: "africa-south1", ci: 656.85 },
  "LPB": { nom: "La Paz", region: "southamerica-west1", ci: 238.0 },
  "LUN": { nom: "Lusaka", region: "africa-south1", ci: 656.85 },
  "LUX": { nom: "Luxembourg", region: "europe-west1", ci: 103.37 },
  "LYA": { nom: "Luoyang", region: "asia-east1", ci: 439.29 },
  "LYS": { nom: "Lyon", region: "europe-west9", ci: 16.3 },
  "MAA": { nom: "Chennai", region: "asia-south1", ci: 678.76 },
  "MAD": { nom: "Madrid", region: "europe-southwest1", ci: 89.04 },
  "MAN": { nom: "Manchester", region: "europe-west2", ci: 105.94 },
  "MAO": { nom: "Manaus", region: "southamerica-east1", ci: 67.32 },
  "MBA": { nom: "Mombasa", region: "africa-south1", ci: 656.85 },
  "MCI": { nom: "Kansas City", region: "us-central1", ci: 412.72 },
  "MCT": { nom: "Mascate", region: "me-central2", ci: 382.23 },
  "MDE": { nom: "Medellín", region: "northamerica-south1", ci: 305.0 },
  "MEL": { nom: "Melbourne", region: "australia-southeast2", ci: 454.37 },
  "MEM": { nom: "Memphis", region: "us-central1", ci: 412.72 },
  "MEX": { nom: "Mexico City", region: "northamerica-south1", ci: 305.0 },
  "MFE": { nom: "McAllen", region: "us-south1", ci: 302.95 },
  "MFM": { nom: "Macao", region: "asia-east2", ci: 505.02 },
  "MIA": { nom: "Miami", region: "us-east1", ci: 575.77 },
  "MLA": { nom: "Malte", region: "europe-west8", ci: 201.69 },
  "MLE": { nom: "Malé", region: "asia-south1", ci: 678.76 },
  "MLG": { nom: "Malang", region: "asia-southeast2", ci: 560.55 },
  "MNL": { nom: "Manille", region: "asia-southeast1", ci: 366.85 },
  "MPM": { nom: "Maputo", region: "africa-south1", ci: 656.85 },
  "MRS": { nom: "Marseille", region: "europe-west9", ci: 16.3 },
  "MRU": { nom: "Port Louis", region: "africa-south1", ci: 656.85 },
  "MSP": { nom: "Minneapolis", region: "us-central1", ci: 412.72 },
  "MSQ": { nom: "Minsk", region: "europe-central2", ci: 642.88 },
  "MUC": { nom: "Munich", region: "europe-west3", ci: 275.82 },
  "MXP": { nom: "Milan", region: "europe-west8", ci: 201.69 },
  "NAG": { nom: "Nagpur", region: "asia-south1", ci: 678.76 },
  "NBO": { nom: "Nairobi", region: "africa-south1", ci: 656.85 },
  "NJF": { nom: "Najaf", region: "me-central1", ci: 366.0 },
  "NNG": { nom: "Nanning", region: "asia-east1", ci: 439.29 },
  "NOU": { nom: "Nouméa", region: "australia-southeast1", ci: 497.5 },
  "NQN": { nom: "Neuquen", region: "southamerica-west1", ci: 238.0 },
  "NQZ": { nom: "Astana", region: "asia-south2", ci: 531.83 },
  "NRT": { nom: "Tokyo", region: "asia-northeast1", ci: 452.85 },
  "NVT": { nom: "Timbo", region: "southamerica-east1", ci: 67.32 },
  "OKA": { nom: "Naha", region: "asia-northeast1", ci: 452.85 },
  "OKC": { nom: "Oklahoma City", region: "us-central2", ci: 372.23 },
  "OMA": { nom: "Omaha", region: "us-central1", ci: 412.72 },
  "ORD": { nom: "Chicago", region: "us-central1", ci: 412.72 },
  "ORF": { nom: "Norfolk", region: "us-east4", ci: 323.05 },
  "ORK": { nom: "Cork", region: "europe-west1", ci: 103.37 },
  "ORN": { nom: "Oran", region: "europe-southwest1", ci: 89.04 },
  "OSL": { nom: "Oslo", region: "europe-north1", ci: 39.32 },
  "OTP": { nom: "Bucarest", region: "europe-central2", ci: 642.88 },
  "OUA": { nom: "Ouagadougou", region: "africa-south1", ci: 656.85 },
  "PAT": { nom: "Patna", region: "asia-south1", ci: 678.76 },
  "PBH": { nom: "Thimphu", region: "asia-south2", ci: 531.83 },
  "PBM": { nom: "Paramaribo", region: "southamerica-east1", ci: 67.32 },
  "PDX": { nom: "Portland", region: "us-west1", ci: 79.23 },
  "PER": { nom: "Perth", region: "australia-southeast1", ci: 497.5 },
  "PHL": { nom: "Philadelphie", region: "us-east4", ci: 323.05 },
  "PHX": { nom: "Phoenix", region: "us-west2", ci: 169.28 },
  "PIT": { nom: "Pittsburgh", region: "us-east5", ci: 323.05 },
  "PKX": { nom: "Beijing", region: "asia-east1", ci: 439.29 },
  "PMO": { nom: "Palerme", region: "europe-west8", ci: 201.69 },
  "PMW": { nom: "Palmas", region: "southamerica-east1", ci: 67.32 },
  "PNH": { nom: "Phnom Penh", region: "asia-southeast1", ci: 366.85 },
  "PNQ": { nom: "Pune", region: "asia-south1", ci: 678.76 },
  "POA": { nom: "Porto Alegre", region: "southamerica-east1", ci: 67.32 },
  "POS": { nom: "Port of Spain", region: "us-east1", ci: 575.77 },
  "PPT": { nom: "Tahiti", region: "australia-southeast1", ci: 497.5 },
  "PRG": { nom: "Prague", region: "europe-west3", ci: 275.82 },
  "PTY": { nom: "Panama City", region: "northamerica-south1", ci: 305.0 },
  "QRO": { nom: "Queretaro", region: "northamerica-south1", ci: 305.0 },
  "QWJ": { nom: "Americana", region: "southamerica-east1", ci: 67.32 },
  "RAO": { nom: "Ribeirao Preto", region: "southamerica-east1", ci: 67.32 },
  "RDU": { nom: "Durham", region: "us-east4", ci: 323.05 },
  "REC": { nom: "Recife", region: "southamerica-east1", ci: 67.32 },
  "RIC": { nom: "Richmond", region: "us-east4", ci: 323.05 },
  "RIX": { nom: "Riga", region: "europe-north1", ci: 39.32 },
  "RUH": { nom: "Riyad", region: "me-central2", ci: 382.23 },
  "RUN": { nom: "Réunion", region: "europe-west9", ci: 16.3 },
  "SAN": { nom: "San Diego", region: "us-west2", ci: 169.28 },
  "SAP": { nom: "San Pedro Sula", region: "northamerica-south1", ci: 305.0 },
  "SAT": { nom: "San Antonio", region: "us-south1", ci: 302.95 },
  "SCL": { nom: "Santiago", region: "southamerica-west1", ci: 238.0 },
  "SDQ": { nom: "Santo Domingo", region: "us-east4", ci: 323.05 },
  "SEA": { nom: "Seattle", region: "us-west1", ci: 79.23 },
  "SFO": { nom: "San Francisco", region: "us-west1", ci: 79.23 },
  "SGN": { nom: "Ho Chi Minh", region: "asia-southeast1", ci: 366.85 },
  "SHA": { nom: "Shanghai", region: "asia-east1", ci: 439.29 },
  "SIN": { nom: "Singapour", region: "asia-southeast1", ci: 366.85 },
  "SJC": { nom: "San Jose", region: "us-west1", ci: 79.23 },
  "SJK": { nom: "São José dos Campos", region: "southamerica-east1", ci: 67.32 },
  "SJO": { nom: "San José CR", region: "northamerica-south1", ci: 305.0 },
  "SJP": { nom: "São José do Rio Preto", region: "southamerica-east1", ci: 67.32 },
  "SJU": { nom: "San Juan", region: "us-east4", ci: 323.05 },
  "SJW": { nom: "Shijiazhuang", region: "asia-east1", ci: 439.29 },
  "SKG": { nom: "Thessalonique", region: "europe-southwest1", ci: 89.04 },
  "SKP": { nom: "Skopje", region: "europe-central2", ci: 642.88 },
  "SLC": { nom: "Salt Lake City", region: "us-west3", ci: 555.17 },
  "SMF": { nom: "Sacramento", region: "us-west1", ci: 79.23 },
  "SOD": { nom: "Sorocaba", region: "southamerica-east1", ci: 67.32 },
  "SOF": { nom: "Sofia", region: "europe-central2", ci: 642.88 },
  "SSA": { nom: "Salvador", region: "southamerica-east1", ci: 67.32 },
  "STI": { nom: "Santiago DR", region: "us-east4", ci: 323.05 },
  "STL": { nom: "St. Louis", region: "us-central1", ci: 412.72 },
  "STR": { nom: "Stuttgart", region: "europe-west3", ci: 275.82 },
  "SUV": { nom: "Suva", region: "australia-southeast1", ci: 497.5 },
  "SVX": { nom: "Iekaterinbourg", region: "europe-central2", ci: 642.88 },
  "SYD": { nom: "Sydney", region: "australia-southeast1", ci: 497.5 },
  "SZX": { nom: "Shenzhen", region: "asia-east1", ci: 439.29 },
  "TAO": { nom: "Qingdao", region: "asia-east1", ci: 439.29 },
  "TAS": { nom: "Tachkent", region: "asia-south2", ci: 531.83 },
  "TBS": { nom: "Tbilissi", region: "me-west1", ci: 433.75 },
  "TEN": { nom: "Tongren", region: "asia-east1", ci: 439.29 },
  "TGU": { nom: "Tegucigalpa", region: "northamerica-south1", ci: 305.0 },
  "TIA": { nom: "Tirana", region: "europe-central2", ci: 642.88 },
  "TLH": { nom: "Tallahassee", region: "us-east1", ci: 575.77 },
  "TLL": { nom: "Tallinn", region: "europe-north1", ci: 39.32 },
  "TLV": { nom: "Tel Aviv", region: "me-west1", ci: 433.75 },
  "TNA": { nom: "Jinan", region: "asia-east1", ci: 439.29 },
  "TNR": { nom: "Antananarivo", region: "africa-south1", ci: 656.85 },
  "TPA": { nom: "Tampa", region: "us-east1", ci: 575.77 },
  "TPE": { nom: "Taipei", region: "asia-east1", ci: 439.29 },
  "TSN": { nom: "Tianjin", region: "asia-east1", ci: 439.29 },
  "TUN": { nom: "Tunis", region: "europe-southwest1", ci: 89.04 },
  "TXL": { nom: "Berlin", region: "europe-west10", ci: 275.82 },
  "TYN": { nom: "Taiyuan", region: "asia-east1", ci: 439.29 },
  "UDI": { nom: "Uberlandia", region: "southamerica-east1", ci: 67.32 },
  "UIO": { nom: "Quito", region: "southamerica-west1", ci: 238.0 },
  "ULN": { nom: "Oulan-Bator", region: "asia-northeast1", ci: 452.85 },
  "URT": { nom: "Surat Thani", region: "asia-southeast1", ci: 366.85 },
  "VCP": { nom: "Campinas", region: "southamerica-east1", ci: 67.32 },
  "VIE": { nom: "Vienne", region: "europe-west6", ci: 15.05 },
  "VIX": { nom: "Vitoria", region: "southamerica-east1", ci: 67.32 },
  "VNO": { nom: "Vilnius", region: "europe-north1", ci: 39.32 },
  "VTE": { nom: "Vientiane", region: "asia-southeast1", ci: 366.85 },
  "WAW": { nom: "Varsovie", region: "europe-central2", ci: 642.88 },
  "WDH": { nom: "Windhoek", region: "africa-south1", ci: 656.85 },
  "WHU": { nom: "Wuhu", region: "asia-east1", ci: 439.29 },
  "WLG": { nom: "Wellington", region: "australia-southeast1", ci: 497.5 },
  "WRO": { nom: "Wroclaw", region: "europe-central2", ci: 642.88 },
  "XAP": { nom: "Chapeco", region: "southamerica-east1", ci: 67.32 },
  "XFN": { nom: "Xiangyang", region: "asia-east1", ci: 439.29 },
  "XIY": { nom: "Xi'an", region: "asia-east1", ci: 439.29 },
  "XNH": { nom: "Nasiriyah", region: "me-central1", ci: 366.0 },
  "XNN": { nom: "Xining", region: "asia-east1", ci: 439.29 },
  "YHZ": { nom: "Halifax", region: "northamerica-northeast1", ci: 5.48 },
  "YOW": { nom: "Ottawa", region: "northamerica-northeast1", ci: 5.48 },
  "YUL": { nom: "Montréal", region: "northamerica-northeast1", ci: 5.48 },
  "YVR": { nom: "Vancouver", region: "us-west1", ci: 79.23 },
  "YWG": { nom: "Winnipeg", region: "northamerica-northeast2", ci: 58.56 },
  "YXE": { nom: "Saskatoon", region: "northamerica-northeast2", ci: 58.56 },
  "YYC": { nom: "Calgary", region: "northamerica-northeast2", ci: 58.56 },
  "YYZ": { nom: "Toronto", region: "northamerica-northeast2", ci: 58.56 },
  "ZAG": { nom: "Zagreb", region: "europe-west8", ci: 201.69 },
  "ZDM": { nom: "Ramallah", region: "me-west1", ci: 433.75 },
  "ZGN": { nom: "Zhongshan", region: "asia-east1", ci: 439.29 },
  "ZRH": { nom: "Zurich", region: "europe-west6", ci: 15.05 }
};

// =========================================================
// 2. ÉCOUTE DES ÉVÉNEMENTS DE inject.js
// =========================================================

window.addEventListener('EcoIA_ZoneDetected', (e) => {
    const code = e.detail.code;
    
    if (IATA_TO_GCP[code]) {
        currentServerZone = IATA_TO_GCP[code].nom;
        currentIntensity  = IATA_TO_GCP[code].ci;
    } else {
        currentServerZone = `Serveur (${code})`;
        currentIntensity  = 436;
    }
    
    console.log(`[Eco-IA] Serveur : ${currentServerZone} | CI = ${currentIntensity} gCO2eq/kWh (région : ${IATA_TO_GCP[code]?.region || "inconnue"})`);
    chrome.storage.local.set({ derniereZone: currentServerZone, derniereCI: currentIntensity });
});

window.addEventListener('EcoIA_ResponseSize', (e) => {
    lastOutputTokens = e.detail.outputTokens;
});

// =========================================================
// 3. DÉTECTION DU MODÈLE ET PARAMÈTRES ÉNERGÉTIQUES
// =========================================================
// Paramètres E_input / E_output en Wh par token
// PUE Google = 1.1 (source : Google Sustainability Report)
// Valeurs estimées à partir de la littérature sur les LLMs

async function getModelParams() {
    const modelSpan = document.querySelector('span.picker-primary-text') || 
                      document.querySelector('[data-testid="model-selector"] span');
    const modelName = modelSpan ? modelSpan.innerText : "";

    if (modelName.includes("Pro")) {
        return { nom: "Gemini Pro", E_input: 0.0000028, E_output: 0.0000056, PUE: 1.1 };
    }
    if (modelName.includes("Flash-Lite") || modelName.includes("Flash Lite")) {
        return { nom: "Gemini Flash-Lite", E_input: 0.0000003, E_output: 0.0000006, PUE: 1.1 };
    }
    if (modelName.includes("Flash")) {
        return { nom: "Gemini Flash", E_input: 0.0000008, E_output: 0.0000016, PUE: 1.1 };
    }
    return { nom: "Gemini Standard", E_input: 0.0000008, E_output: 0.0000016, PUE: 1.1 };
}

// =========================================================
// 4. CALCUL AVEC LES FORMULES OFFICIELLES
// =========================================================
// Formule 1 : E_totale (Wh) = (N_input × E_input + N_output × E_output) × PUE
// Formule 2 : CO₂ (g)       = (E_totale / 1000) × CI_regional

async function saveImpact(promptText) {
    if (!promptText || promptText.trim().length === 0) return;

    const params = await getModelParams();
    
    // Estimation tokens : ~4 caractères par token (convention NLP)
    const N_input  = Math.round(promptText.length / 4);
    const N_output = lastOutputTokens > 0 ? lastOutputTokens : Math.round(N_input * 1.5);
    lastOutputTokens = 0;
    
    // Formule 1
    const E_totale_Wh = (N_input * params.E_input + N_output * params.E_output) * params.PUE;
    
    // Formule 2
    const CO2_grams = (E_totale_Wh / 1000) * currentIntensity;
    
    console.log(`[Eco-IA] N_in=${N_input} N_out=${N_output} | E=${E_totale_Wh.toFixed(6)}Wh | CO2=${CO2_grams.toFixed(6)}g | CI=${currentIntensity} | Modèle=${params.nom}`);

    chrome.storage.local.get(['totalEnergy', 'totalCO2', 'requetesCount'], function(result) {
        chrome.storage.local.set({ 
            totalEnergy:   (result.totalEnergy   || 0) + E_totale_Wh,
            totalCO2:      (result.totalCO2      || 0) + CO2_grams,
            requetesCount: (result.requetesCount || 0) + 1,
            dernierModele: params.nom,
            derniereZone:  currentServerZone,
            derniereCI:    currentIntensity
        });
    });
}

// =========================================================
// 5. INTERCEPTION DES ÉVÉNEMENTS UTILISATEUR
// =========================================================

function getInputText() {
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
