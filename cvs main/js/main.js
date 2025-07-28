// Import dependencies
import config from './config.js';
import WalletConnector from './wallet-connector.js';
import StakingManager from './staking-manager.js';
import PresaleManager from './presale-manager.js';
import AirdropManager from './airdrop-manager.js';
import WebSocketManager from './websocket-manager.js';
import ChartManager from './chart-manager.js';
import UIManager from './ui-manager.js';

class App {
    constructor() {
        this.initialized = false;
        this.managers = {};
    }

    async initialize() {
        try {
            // Show loading screen
            document.getElementById('loadingOverlay').style.display = 'flex';
            document.getElementById('loadingText').textContent = 'Initializing application...';

            // Initialize managers
            this.managers.wallet = new WalletConnector();
            this.managers.staking = new StakingManager(this.managers.wallet);
            this.managers.presale = new PresaleManager(this.managers.wallet);
            this.managers.airdrop = new AirdropManager(this.managers.wallet);
            this.managers.websocket = new WebSocketManager(this.managers.wallet);
            this.managers.chart = new ChartManager();
            this.managers.ui = new UIManager();

            // Initialize wallet connection
            await this.managers.wallet.initialize();

            // Initialize other managers
            await Promise.all([
                this.managers.staking.initialize(),
                this.managers.presale.initialize(),
                this.managers.airdrop.initialize()
            ]);

            // Setup WebSocket connections and subscriptions
            await this.managers.websocket.connect();
            this.managers.websocket.subscribeToUpdates(
                this.managers.staking,
                this.managers.presale,
                this.managers.airdrop
            );

            // Initialize charts
            await this.managers.chart.initialize();

            // Setup periodic updates
            this.setupPeriodicUpdates();

            this.initialized = true;
            document.getElementById('loadingOverlay').style.display = 'none';

            // Show success message
            this.managers.ui.showToast('Application initialized successfully', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.managers.ui.showToast('Failed to initialize application', 'error');
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    }

    setupPeriodicUpdates() {
        // Update prices every 10 seconds
        setInterval(() => {
            this.managers.chart.updatePrices();
        }, config.PRICE_UPDATE_INTERVAL);

        // Update charts every 30 seconds
        setInterval(() => {
            this.managers.chart.updateCharts();
        }, config.CHART_UPDATE_INTERVAL);
    }

    // Global error handler
    handleError(error) {
        console.error('Application error:', error);
        this.managers.ui.showToast(error.message, 'error');
    }
}

// Initialize application
const app = new App();
window.addEventListener('load', () => {
    app.initialize().catch(error => app.handleError(error));
});

// Export for global access if needed
window.app = app; 