import config from './config.js';
import UIComponents from './components.js';

class WebSocketManager {
    constructor(walletConnector) {
        this.walletConnector = walletConnector;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second delay
        this.handlers = new Map();
        this.isConnected = false;
        this.pingInterval = null;
    }

    async connect() {
        try {
            const token = this.walletConnector.getAuthToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const wsUrl = `${config.WS_BASE_URL}?token=${token}`;
            this.ws = new WebSocket(wsUrl);

            this.setupEventListeners();
            await this.waitForConnection();
            
            this.startPingInterval();
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            this.isConnected = true;

            console.log('WebSocket connected successfully');
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleConnectionError();
        }
    }

    setupEventListeners() {
        this.ws.onopen = () => {
            console.log('WebSocket connection established');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('WebSocket message parsing error:', error);
            }
        };

        this.ws.onclose = (event) => {
            this.isConnected = false;
            this.stopPingInterval();
            
            if (!event.wasClean) {
                console.warn('WebSocket connection closed unexpectedly');
                this.handleConnectionError();
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleConnectionError();
        };
    }

    async waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 5000);

            if (this.ws.readyState === WebSocket.OPEN) {
                clearTimeout(timeout);
                resolve();
            } else {
                this.ws.addEventListener('open', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });

                this.ws.addEventListener('error', () => {
                    clearTimeout(timeout);
                    reject(new Error('WebSocket connection failed'));
                }, { once: true });
            }
        });
    }

    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Send ping every 30 seconds
    }

    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    async handleConnectionError() {
        this.isConnected = false;
        this.stopPingInterval();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
            
            console.log(`Attempting to reconnect in ${delay/1000} seconds... (Attempt ${this.reconnectAttempts})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            await this.connect();
        } else {
            console.error('Max reconnection attempts reached');
            UIComponents.showToast('Connection lost. Please refresh the page.', 'error');
        }
    }

    subscribe(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
    }

    unsubscribe(type, handler) {
        if (this.handlers.has(type)) {
            this.handlers.get(type).delete(handler);
        }
    }

    handleMessage(data) {
        // Handle pong response
        if (data.type === 'pong') {
            return;
        }

        // Handle error messages
        if (data.type === 'error') {
            console.error('WebSocket error message:', data.message);
            UIComponents.showToast(data.message, 'error');
            return;
        }

        // Handle data updates
        const handlers = this.handlers.get(data.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data.data);
                } catch (error) {
                    console.error(`Handler error for type ${data.type}:`, error);
                }
            });
        }
    }

    send(data) {
        if (!this.isConnected) {
            console.warn('Attempting to send message while disconnected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('WebSocket send error:', error);
            return false;
        }
    }

    subscribeToUpdates(stakingManager, presaleManager, airdropManager) {
        // Subscribe to price updates
        this.subscribe('price_update', (data) => {
            document.getElementById('solPrice').textContent = data.sol.toFixed(2);
            document.getElementById('cvtPrice').textContent = data.cvt.toFixed(4);
        });

        // Subscribe to staking updates
        this.subscribe('staking_update', (data) => {
            stakingManager.handleUpdate(data);
        });

        // Subscribe to presale updates
        this.subscribe('presale_update', (data) => {
            presaleManager.handleUpdate(data);
        });

        // Subscribe to airdrop updates
        this.subscribe('airdrop_update', (data) => {
            airdropManager.handleUpdate(data);
        });
    }

    disconnect() {
        this.isConnected = false;
        this.stopPingInterval();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.handlers.clear();
    }
}

export default WebSocketManager; 