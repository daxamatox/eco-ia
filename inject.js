(function() {
    // On sauvegarde la fonction fetch originale du navigateur
    const originalFetch = window.fetch;

    // On la remplace par notre propre version (l'intercepteur)
    window.fetch = async (...args) => {
        // On laisse la requête s'exécuter normalement
        const response = await originalFetch(...args);
        
        // On récupère l'URL de la requête pour vérifier si c'est bien une discussion IA
        let url = typeof args[0] === 'string' ? args[0] : (args[0].url || "");

        // Les requêtes d'IA contiennent souvent 'conversation' ou 'generate'
        if ((url.includes('/conversation') || url.includes('generate')) && response.ok) {
            
            // On cherche l'en-tête de routage Cloudflare
            const cfRay = response.headers.get('cf-ray');
            
            if (cfRay && cfRay.includes('-')) {
                // Le cf-ray
                const lieu = cfRay.split('-')[1].toUpperCase();
                
                //On envoie à contet.js
                window.dispatchEvent(new CustomEvent('EcoIA_ZoneDetected', { 
                    detail: { code: lieu } 
                }));
            }
        }
        
        // On retourne la réponse à la page web pour ne rien casser
        return response;
    };
})();