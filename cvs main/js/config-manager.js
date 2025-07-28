class ConfigManager {
    constructor() {
        this.config = {
            // API Endpoints
            API_BASE_URL: 'https://api.coinverse.com',
            WS_BASE_URL: 'wss://ws.coinverse.com',
            
            // Network Settings
            SOLANA_NETWORK: 'mainnet-beta',
            RPC_ENDPOINT: 'https://api.mainnet-beta.solana.com',
            
            // Contract Addresses
            CONTRACTS: {
                TOKEN: 'CVTXYZcontractAddressHere123...',
                STAKING: 'StakXYZcontractAddressHere123...',
                PRESALE: 'PreXYZcontractAddressHere123...',
                AIRDROP: 'AirXYZcontractAddressHere123...'
            },
            
            // UI Settings
            UI: {
                THEME: 'light',
                ITEMS_PER_PAGE: 10,
                TOAST_DURATION: 3000,
                CHART_UPDATE_INTERVAL: 30000,
                PRICE_UPDATE_INTERVAL: 10000
            },
            
            // Feature Flags
            FEATURES: {
                STAKING: true,
                PRESALE: true,
                AIRDROP: true,
                TRADING: false
            }
        };
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.config);
    }

    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.config);
        target[lastKey] = value;
        this.saveToLocalStorage();
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('app_config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            } catch (error) {
                console.error('Failed to load config:', error);
            }
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('app_config', JSON.stringify(this.config));
        } catch (error) {
            console.error('Failed to save config:', error);
        }
    }

    isFeatureEnabled(feature) {
        return this.get(`FEATURES.${feature}`) === true;
    }
}

export default new ConfigManager(); 