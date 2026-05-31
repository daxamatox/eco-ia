(function() {
    const originalFetch = window.fetch;

    // Mapping timezone → code IATA le plus proche
    // Gemini (Google) route vers le datacenter le plus proche de l'utilisateur
    // On utilise la timezone comme proxy de localisation
    const TIMEZONE_TO_IATA = {
        // Europe
        "Europe/Paris":        "CDG",
        "Europe/Berlin":       "TXL",
        "Europe/London":       "LHR",
        "Europe/Amsterdam":    "AMS",
        "Europe/Brussels":     "BRU",
        "Europe/Luxembourg":   "LUX",
        "Europe/Dublin":       "DUB",
        "Europe/Madrid":       "MAD",
        "Europe/Lisbon":       "LIS",
        "Europe/Rome":         "MXP",
        "Europe/Milan":        "MXP",
        "Europe/Zurich":       "ZRH",
        "Europe/Vienna":       "VIE",
        "Europe/Warsaw":       "WAW",
        "Europe/Prague":       "PRG",
        "Europe/Budapest":     "BUD",
        "Europe/Bucharest":    "OTP",
        "Europe/Sofia":        "SOF",
        "Europe/Athens":       "ATH",
        "Europe/Helsinki":     "HEL",
        "Europe/Stockholm":    "ARN",
        "Europe/Oslo":         "OSL",
        "Europe/Copenhagen":   "CPH",
        "Europe/Riga":         "RIX",
        "Europe/Tallinn":      "TLL",
        "Europe/Vilnius":      "VNO",
        "Europe/Kiev":         "KBP",
        "Europe/Kyiv":         "KBP",
        "Europe/Moscow":       "DME",
        "Europe/Istanbul":     "IST",
        "Europe/Belgrade":     "BEG",
        "Europe/Zagreb":       "ZAG",
        "Europe/Ljubljana":    "LJU",
        "Europe/Bratislava":   "BTS",
        "Europe/Minsk":        "MSQ",
        "Europe/Chisinau":     "KIV",
        // Amérique du Nord
        "America/New_York":    "EWR",
        "America/Chicago":     "ORD",
        "America/Denver":      "DEN",
        "America/Los_Angeles": "LAX",
        "America/Phoenix":     "PHX",
        "America/Seattle":     "SEA",
        "America/San_Francisco":"SFO",
        "America/Vancouver":   "YVR",
        "America/Toronto":     "YYZ",
        "America/Montreal":    "YUL",
        "America/Halifax":     "YHZ",
        "America/Dallas":      "DFW",
        "America/Houston":     "IAH",
        "America/Miami":       "MIA",
        "America/Atlanta":     "ATL",
        "America/Boston":      "BOS",
        "America/Detroit":     "DTW",
        "America/Minneapolis": "MSP",
        "America/Mexico_City": "MEX",
        // Amérique du Sud
        "America/Sao_Paulo":   "GRU",
        "America/Buenos_Aires":"EZE",
        "America/Santiago":    "SCL",
        "America/Lima":        "LIM",
        "America/Bogota":      "BOG",
        // Asie
        "Asia/Tokyo":          "NRT",
        "Asia/Seoul":          "ICN",
        "Asia/Shanghai":       "SHA",
        "Asia/Hong_Kong":      "HKG",
        "Asia/Singapore":      "SIN",
        "Asia/Kuala_Lumpur":   "KUL",
        "Asia/Bangkok":        "BKK",
        "Asia/Jakarta":        "CGK",
        "Asia/Kolkata":        "BOM",
        "Asia/Calcutta":       "BOM",
        "Asia/Mumbai":         "BOM",
        "Asia/Delhi":          "DEL",
        "Asia/Karachi":        "KHI",
        "Asia/Dhaka":          "DAC",
        "Asia/Colombo":        "CMB",
        "Asia/Kathmandu":      "KTM",
        "Asia/Taipei":         "TPE",
        "Asia/Manila":         "MNL",
        "Asia/Ho_Chi_Minh":    "SGN",
        "Asia/Hanoi":          "HAN",
        "Asia/Dubai":          "DXB",
        "Asia/Riyadh":         "RUH",
        "Asia/Qatar":          "DOH",
        "Asia/Kuwait":         "KWI",
        "Asia/Baghdad":        "BGW",
        "Asia/Tehran":         "DME",
        "Asia/Jerusalem":      "TLV",
        "Asia/Beirut":         "BEY",
        "Asia/Almaty":         "ALA",
        "Asia/Tashkent":       "TAS",
        "Asia/Tbilisi":        "TBS",
        "Asia/Yerevan":        "EVN",
        "Asia/Baku":           "GYD",
        // Océanie
        "Australia/Sydney":    "SYD",
        "Australia/Melbourne": "MEL",
        "Australia/Brisbane":  "BNE",
        "Australia/Perth":     "PER",
        "Pacific/Auckland":    "AKL",
        // Afrique
        "Africa/Johannesburg": "JNB",
        "Africa/Cairo":        "CAI",
        "Africa/Lagos":        "LOS",
        "Africa/Nairobi":      "NBO",
        "Africa/Casablanca":   "CMN",
        "Africa/Algiers":      "ALG",
        "Africa/Tunis":        "TUN",
        "Africa/Dakar":        "DKR",
    };

    // Détection unique via timezone (au chargement)
    function detectZoneFromTimezone() {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const code = TIMEZONE_TO_IATA[tz];
            if (code) {
                console.log(`[Eco-IA] Timezone: ${tz} → ${code}`);
                window.dispatchEvent(new CustomEvent('EcoIA_ZoneDetected', {
                    detail: { code, source: 'timezone' }
                }));
            } else {
                // Essai avec préfixe partiel (ex: "Europe/..." → CDG par défaut)
                const prefix = tz.split('/')[0];
                const fallbacks = { Europe: 'CDG', America: 'EWR', Asia: 'SIN', Africa: 'JNB', Australia: 'SYD', Pacific: 'SYD' };
                const fallback = fallbacks[prefix];
                if (fallback) {
                    window.dispatchEvent(new CustomEvent('EcoIA_ZoneDetected', {
                        detail: { code: fallback, source: 'timezone-fallback' }
                    }));
                }
            }
        } catch(e) {}
    }

    detectZoneFromTimezone();

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        let url = typeof args[0] === 'string' ? args[0] : (args[0].url || "");

        if ((url.includes('/conversation') || url.includes('generate')) && response.ok) {

            // Stratégie 1 : CF-Ray (Cloudflare, peu probable sur Google)
            const cfRay = response.headers.get('cf-ray');
            if (cfRay && cfRay.includes('-')) {
                const lieu = cfRay.split('-')[1].toUpperCase();
                window.dispatchEvent(new CustomEvent('EcoIA_ZoneDetected', {
                    detail: { code: lieu, source: 'cf-ray' }
                }));
            }

            // Stratégie 2 : server-timing (Google inclut parfois la région)
            const serverTiming = response.headers.get('server-timing');
            if (serverTiming) {
                console.log('[Eco-IA] server-timing:', serverTiming);
            }

            // Taille réponse pour tokens output
            try {
                const clone = response.clone();
                const text = await clone.text();
                window.dispatchEvent(new CustomEvent('EcoIA_ResponseSize', {
                    detail: { outputTokens: Math.round(text.length / 4) }
                }));
            } catch(e) {}
        }

        return response;
    };
})();
