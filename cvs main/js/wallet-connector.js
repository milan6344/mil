import config from './config.js';
import UIComponents from './components.js';

class WalletConnector {
    constructor() {
        this.provider = null;
        this.address = null;
        this.authToken = null;
        this.connection = null;
        this.isConnected = false;
        this.supportedWallets = ['phantom', 'solflare', 'slope'];
    }

    async initialize() {
        try {
            // Initialize Solana connection
            this.connection = new solanaWeb3.Connection(
                solanaWeb3.clusterApiUrl(config.SOLANA_NETWORK),
                'confirmed'
            );

            // Check for existing connection
            await this.checkExistingConnection();
            
            // Setup event listeners
            this.setupEventListeners();

            return true;
        } catch (error) {
            console.error('Wallet initialization error:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Wallet connect buttons
        this.supportedWallets.forEach(wallet => {
            document.getElementById(`connect${wallet.charAt(0).toUpperCase() + wallet.slice(1)}`)
                ?.addEventListener('click', () => this.connectWallet(wallet));
        });

        // Disconnect button
        document.getElementById('disconnectWallet')?.addEventListener('click', () => {
            this.disconnect();
        });

        // Network change listener
        window.addEventListener('networkChanged', async (e) => {
            if (e.detail.network !== config.SOLANA_NETWORK) {
                UIComponents.showToast(`Please switch to ${config.SOLANA_NETWORK} network`, 'error');
                await this.disconnect();
            }
        });
    }

    async checkExistingConnection() {
        const savedWallet = localStorage.getItem('selectedWallet');
        const savedAddress = localStorage.getItem('walletAddress');
        const savedToken = localStorage.getItem('authToken');

        if (savedWallet && savedAddress && savedToken) {
            try {
                await this.connectWallet(savedWallet, true);
                return true;
            } catch (error) {
                console.error('Reconnection error:', error);
                this.clearStoredConnection();
                return false;
            }
        }
        return false;
    }

    async connectWallet(walletName, isReconnect = false) {
        try {
            if (this.isConnected) {
                return true;
            }

            UIComponents.showLoading('Connecting wallet...');

            // Get wallet provider
            const provider = await this.getWalletProvider(walletName);
            if (!provider) {
                throw new Error(`${walletName} wallet not found`);
            }

            // Connect to wallet
            await provider.connect();
            
            // Get wallet public key
            const publicKey = provider.publicKey;
            if (!publicKey) {
                throw new Error('Failed to get public key');
            }

            // Verify wallet ownership
            const message = `Sign this message to verify your wallet ownership: ${Date.now()}`;
            const signedMessage = await this.signMessage(provider, message);
            
            // Authenticate with backend
            const authData = await this.authenticate(publicKey.toString(), signedMessage, message);
            
            // Store connection data
            this.provider = provider;
            this.address = publicKey.toString();
            this.authToken = authData.token;
            this.isConnected = true;

            // Save connection info
            this.storeConnection(walletName);

            // Update UI
            this.updateUI();
            
            if (!isReconnect) {
                UIComponents.showToast('Wallet connected successfully', 'success');
            }

            return true;
        } catch (error) {
            console.error('Wallet connection error:', error);
            if (!isReconnect) {
                UIComponents.showToast(error.message, 'error');
            }
            await this.disconnect();
            return false;
        } finally {
            UIComponents.hideLoading();
        }
    }

    async getWalletProvider(walletName) {
        switch (walletName.toLowerCase()) {
            case 'phantom':
                return window.phantom?.solana;
            case 'solflare':
                return window.solflare;
            case 'slope':
                return window.slope;
            default:
                throw new Error('Unsupported wallet');
        }
    }

    async signMessage(provider, message) {
        try {
            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
            return Buffer.from(signedMessage).toString('hex');
        } catch (error) {
            console.error('Message signing error:', error);
            throw new Error('Failed to sign message');
        }
    }

    async authenticate(address, signature, message) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    address,
                    signature,
                    message
                })
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Authentication error:', error);
            throw new Error('Failed to authenticate with server');
        }
    }

    storeConnection(walletName) {
        localStorage.setItem('selectedWallet', walletName);
        localStorage.setItem('walletAddress', this.address);
        localStorage.setItem('authToken', this.authToken);
    }

    clearStoredConnection() {
        localStorage.removeItem('selectedWallet');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('authToken');
    }

    async disconnect() {
        try {
            if (this.provider && this.provider.disconnect) {
                await this.provider.disconnect();
            }
        } catch (error) {
            console.error('Disconnect error:', error);
        } finally {
            this.provider = null;
            this.address = null;
            this.authToken = null;
            this.isConnected = false;
            this.clearStoredConnection();
            this.updateUI();
            UIComponents.showToast('Wallet disconnected', 'info');
        }
    }

    updateUI() {
        // Update connect button
        const connectButton = document.getElementById('connectWallet');
        const disconnectButton = document.getElementById('disconnectWallet');
        const addressDisplay = document.getElementById('walletAddress');

        if (connectButton) {
            connectButton.style.display = this.isConnected ? 'none' : 'block';
        }

        if (disconnectButton) {
            disconnectButton.style.display = this.isConnected ? 'block' : 'none';
        }

        if (addressDisplay && this.address) {
            addressDisplay.textContent = `${this.address.slice(0, 4)}...${this.address.slice(-4)}`;
        }

        // Update connection status
        document.body.classList.toggle('wallet-connected', this.isConnected);
    }

    getAuthToken() {
        return this.authToken;
    }

    async getBalance() {
        try {
            if (!this.isConnected || !this.address) {
                throw new Error('Wallet not connected');
            }

            const publicKey = new solanaWeb3.PublicKey(this.address);
            const balance = await this.connection.getBalance(publicKey);
            return balance / solanaWeb3.LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Balance check error:', error);
            throw error;
        }
    }

    // Transaction methods
    async sendTransaction(transaction, signers = []) {
        try {
            if (!this.isConnected) {
                throw new Error('Wallet not connected');
            }

            transaction.recentBlockhash = (
                await this.connection.getRecentBlockhash()
            ).blockhash;

            transaction.feePayer = this.provider.publicKey;

            if (signers.length > 0) {
                transaction.sign(...signers);
            }

            const signed = await this.provider.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(
                signed.serialize()
            );

            await this.connection.confirmTransaction(signature);
            return signature;
        } catch (error) {
            console.error('Transaction error:', error);
            throw error;
        }
    }
}

export default WalletConnector; 