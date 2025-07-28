import config from './config.js';
import UIComponents from './components.js';

class PresaleManager {
    constructor(walletConnector) {
        this.walletConnector = walletConnector;
        this.presaleData = {
            tokenPrice: config.PRESALE_PRICE,
            totalSold: 0,
            hardCap: 1000000,
            minBuy: config.MIN_BUY,
            maxBuy: config.MAX_BUY,
            userContribution: 0,
            status: 'active'
        };
    }

    async initialize() {
        try {
            await this.loadPresaleData();
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error('Presale initialization error:', error);
            return false;
        }
    }

    async loadPresaleData() {
        try {
            const response = await fetch(
                `${config.API_BASE_URL}/presale/${this.walletConnector.address}`
            );
            if (!response.ok) throw new Error('Failed to load presale data');
            
            this.presaleData = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Load presale data error:', error);
            throw error;
        }
    }

    setupEventListeners() {
        document.getElementById('buyButton')?.addEventListener('click', () => {
            this.handleBuyTokens();
        });

        // Amount input validation
        const amountInput = document.getElementById('buyAmount');
        if (amountInput) {
            amountInput.addEventListener('input', (e) => {
                const amount = parseFloat(e.target.value);
                this.validateAmount(amount);
            });
        }
    }

    validateAmount(amount) {
        const buyButton = document.getElementById('buyButton');
        const errorText = document.getElementById('buyError');
        
        if (isNaN(amount) || amount < config.MIN_BUY) {
            errorText.textContent = `Minimum buy amount is ${config.MIN_BUY} SOL`;
            buyButton.disabled = true;
            return false;
        }
        
        if (amount > config.MAX_BUY) {
            errorText.textContent = `Maximum buy amount is ${config.MAX_BUY} SOL`;
            buyButton.disabled = true;
            return false;
        }

        errorText.textContent = '';
        buyButton.disabled = false;
        return true;
    }

    async handleBuyTokens() {
        try {
            UIComponents.showLoading('Processing purchase...');
            
            const amountInput = document.getElementById('buyAmount');
            const amount = parseFloat(amountInput.value);

            if (!this.validateAmount(amount)) {
                throw new Error('Invalid purchase amount');
            }

            // Calculate tokens amount
            const tokensAmount = amount / this.presaleData.tokenPrice;

            // Call smart contract
            const transaction = await this.walletConnector.provider.buyTokens(amount);
            
            // Update backend
            await this.updatePresaleBackend(amount, tokensAmount, transaction.signature);
            
            // Update UI
            this.presaleData.userContribution += amount;
            this.presaleData.totalSold += tokensAmount;
            this.updateUI();
            
            UIComponents.showToast(`Successfully purchased ${tokensAmount.toFixed(2)} CVT`, 'success');
            amountInput.value = '';
        } catch (error) {
            console.error('Buy tokens error:', error);
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async updatePresaleBackend(amount, tokens, transactionHash) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/presale/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.walletConnector.getAuthToken()}`
                },
                body: JSON.stringify({
                    walletAddress: this.walletConnector.address,
                    amount,
                    tokens,
                    transactionHash,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error('Failed to update presale data');
            
            return await response.json();
        } catch (error) {
            console.error('Update presale backend error:', error);
            throw error;
        }
    }

    updateUI() {
        // Update token price
        const priceElement = document.getElementById('tokenPrice');
        if (priceElement) {
            priceElement.textContent = `${this.presaleData.tokenPrice} SOL`;
        }

        // Update user contribution
        const contributionElement = document.getElementById('yourTokens');
        if (contributionElement) {
            contributionElement.textContent = 
                `${(this.presaleData.userContribution / this.presaleData.tokenPrice).toFixed(2)} CVT`;
        }

        // Update progress bar
        const progressBar = document.getElementById('presaleProgressBar');
        if (progressBar) {
            const progress = (this.presaleData.totalSold / this.presaleData.hardCap) * 100;
            UIComponents.animateProgress('presaleProgressBar', progress);
        }

        // Update status
        const statusElement = document.getElementById('presaleStatus');
        if (statusElement) {
            statusElement.textContent = this.presaleData.status.toUpperCase();
            statusElement.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                this.presaleData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`;
        }
    }

    // WebSocket update handler
    handleUpdate(data) {
        this.presaleData = { ...this.presaleData, ...data };
        this.updateUI();
    }
}

export default PresaleManager; 