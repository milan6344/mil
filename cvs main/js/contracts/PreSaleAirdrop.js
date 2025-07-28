const PRESALE_CONTRACT_ADDRESS = "YOUR_PRESALE_CONTRACT_ADDRESS";
const AIRDROP_CONTRACT_ADDRESS = "YOUR_AIRDROP_CONTRACT_ADDRESS";

// ABI for PreSale and Airdrop contracts
const PRESALE_ABI = [
    // PreSale Contract ABI
];

const AIRDROP_ABI = [
    // Airdrop Contract ABI
];

class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.presaleContract = null;
        this.airdropContract = null;
        this.userBalance = 0;
        this.solPrice = 0;
    }

    async initialize() {
        try {
            // Connect to Solana wallet
            if (window.solana && window.solana.isPhantom) {
                this.provider = window.solana;
                await this.connectWallet();
                await this.setupContracts();
                await this.fetchSolPrice();
                return true;
            } else {
                throw new Error("Phantom wallet not found!");
            }
        } catch (error) {
            console.error("Initialization error:", error);
            return false;
        }
    }

    async connectWallet() {
        try {
            const response = await this.provider.connect();
            this.walletAddress = response.publicKey.toString();
            await this.updateBalance();
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error("Connection error:", error);
            return false;
        }
    }

    async updateBalance() {
        try {
            const balance = await this.provider.connection.getBalance(
                new solanaWeb3.PublicKey(this.walletAddress)
            );
            this.userBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
            this.updateUI();
            return this.userBalance;
        } catch (error) {
            console.error("Balance update error:", error);
            return 0;
        }
    }

    async fetchSolPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            this.solPrice = data.solana.usd;
            return this.solPrice;
        } catch (error) {
            console.error("Price fetch error:", error);
            return 0;
        }
    }

    calculateUsdValue(solAmount) {
        return solAmount * this.solPrice;
    }

    async checkPresaleEligibility() {
        const usdBalance = this.calculateUsdValue(this.userBalance);
        return usdBalance >= 15; // Minimum $15 requirement
    }

    async checkAirdropEligibility() {
        const usdBalance = this.calculateUsdValue(this.userBalance);
        return usdBalance >= 2; // Minimum $2 for claiming
    }

    async participateInPresale(solAmount) {
        try {
            const usdValue = this.calculateUsdValue(solAmount);
            if (usdValue < 15 || usdValue > 2000) {
                throw new Error("Amount outside allowed range ($15-$2000)");
            }

            const transaction = await this.presaleContract.participate({
                value: solAmount * solanaWeb3.LAMPORTS_PER_SOL
            });
            await transaction.wait();
            
            this.showToast('Success', 'Successfully participated in presale!');
            await this.updateBalance();
            return true;
        } catch (error) {
            console.error("Presale participation error:", error);
            this.showToast('Error', error.message);
            return false;
        }
    }

    async claimAirdrop() {
        try {
            if (!await this.checkAirdropEligibility()) {
                throw new Error("Insufficient balance for airdrop claim");
            }

            const claimFee = 2 / this.solPrice; // Convert $2 to SOL
            const transaction = await this.airdropContract.claim({
                value: claimFee * solanaWeb3.LAMPORTS_PER_SOL
            });
            await transaction.wait();
            
            this.showToast('Success', 'Airdrop claimed successfully!');
            await this.updateBalance();
            return true;
        } catch (error) {
            console.error("Airdrop claim error:", error);
            this.showToast('Error', error.message);
            return false;
        }
    }

    updateUI() {
        // Update wallet connection button
        const connectButton = document.getElementById('connectWallet');
        if (this.walletAddress) {
            connectButton.innerHTML = `
                <i class="fas fa-wallet mr-2"></i>
                ${this.walletAddress.slice(0, 4)}...${this.walletAddress.slice(-4)}
            `;
            connectButton.classList.add('connected');
        }

        // Update balance displays
        const balanceDisplay = document.getElementById('walletBalance');
        if (balanceDisplay) {
            balanceDisplay.textContent = `${this.userBalance.toFixed(4)} SOL ($${this.calculateUsdValue(this.userBalance).toFixed(2)})`;
        }

        // Update presale eligibility
        const presaleButton = document.getElementById('presaleButton');
        if (presaleButton) {
            presaleButton.disabled = !this.checkPresaleEligibility();
        }

        // Update airdrop eligibility
        const airdropButton = document.getElementById('airdropButton');
        if (airdropButton) {
            airdropButton.disabled = !this.checkAirdropEligibility();
        }
    }

    showToast(type, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type.toLowerCase()}`;
        toast.textContent = message;
        
        const container = document.getElementById('toastContainer');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    setupEventListeners() {
        // Listen for account changes
        this.provider.on('accountChanged', async () => {
            await this.updateBalance();
        });

        // Listen for network changes
        this.provider.on('networkChanged', async () => {
            await this.initialize();
        });
    }
}

// Initialize wallet manager
const walletManager = new WalletManager();
document.addEventListener('DOMContentLoaded', () => {
    walletManager.initialize();
}); 