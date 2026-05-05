(function() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        let url = typeof args[0] === 'string' ? args[0] : (args[0].url || "");

        if (url.includes('/conversation') && response.ok) {
            const cfRay = response.headers.get('cf-ray');
            if (cfRay && cfRay.includes('-')) {
                // On extrait le code (ex: "AMS") et on force les majuscules
                const lieu = cfRay.split('-')[1].toUpperCase();
                
                // On récupère le nom de la ville dans ton dictionnaire airports
                const city = airports[lieu] || `Zone ${lieu}`;
                
                window.dispatchEvent(new CustomEvent('EcoIA_ZoneDetected', { 
                    detail: { name: city } 
                }));
            }
        }
        return response;
    };
})();