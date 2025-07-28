const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketManager {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map(); // Map to store client connections
        this.initialize();
    }

    initialize() {
        this.wss.on('connection', async (ws, req) => {
            try {
                // Extract token from URL parameters
                const urlParams = new URLSearchParams(req.url.split('?')[1]);
                const token = urlParams.get('token');

                if (!token) {
                    ws.close(4001, 'Authentication required');
                    return;
                }

                // Verify JWT token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const walletAddress = decoded.walletAddress;

                // Store client connection
                this.clients.set(walletAddress, ws);

                // Setup message handlers
                ws.on('message', (message) => this.handleMessage(walletAddress, message));
                ws.on('close', () => this.handleDisconnect(walletAddress));

                // Send initial data
                this.sendUserData(walletAddress);
            } catch (error) {
                ws.close(4002, 'Authentication failed');
            }
        });
    }

    async handleMessage(walletAddress, message) {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'subscribe_price':
                    this.subscribeToPriceUpdates(walletAddress);
                    break;
                case 'subscribe_staking':
                    this.subscribeToStakingUpdates(walletAddress);
                    break;
                case 'ping':
                    this.sendPong(walletAddress);
                    break;
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    }

    handleDisconnect(walletAddress) {
        this.clients.delete(walletAddress);
    }

    // Send data to specific client
    sendToClient(walletAddress, data) {
        const client = this.clients.get(walletAddress);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }

    // Broadcast to all connected clients
    broadcast(data) {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    // Send user-specific data
    async sendUserData(walletAddress) {
        const User = require('./models/User');
        try {
            const user = await User.findOne({ walletAddress });
            if (user) {
                this.sendToClient(walletAddress, {
                    type: 'user_data',
                    data: user
                });
            }
        } catch (error) {
            console.error('Error sending user data:', error);
        }
    }

    // Real-time price updates
    startPriceUpdates() {
        setInterval(() => {
            // Fetch and broadcast price updates
            const priceData = {
                type: 'price_update',
                data: {
                    sol: getCurrentPrice('SOL'),
                    cvt: getCurrentPrice('CVT')
                }
            };
            this.broadcast(priceData);
        }, 10000); // Every 10 seconds
    }

    // Real-time staking updates
    async updateStakingData(walletAddress) {
        const User = require('./models/User');
        try {
            const user = await User.findOne({ walletAddress });
            if (user) {
                const stakingData = {
                    type: 'staking_update',
                    data: {
                        stakedAmount: user.staking.stakedAmount,
                        rewards: user.staking.rewards
                    }
                };
                this.sendToClient(walletAddress, stakingData);
            }
        } catch (error) {
            console.error('Error updating staking data:', error);
        }
    }
}

module.exports = WebSocketManager; 