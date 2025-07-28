const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const WebSocketManager = require('./websocket');
const http = require('http');

const { validateUser } = require('./middleware/validation');
const { apiLimiter, helmet, authenticateToken, trackIP } = require('./middleware/security');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());
app.use(trackIP);
app.use('/api', apiLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Enhanced User Schema
const userSchema = new mongoose.Schema({
    walletAddress: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    balance: {
        sol: { type: Number, default: 0 },
        usdt: { type: Number, default: 0 },
        cvt: { type: Number, default: 0 }
    },
    staking: {
        stakedAmount: { type: Number, default: 0 },
        rewards: { type: Number, default: 0 },
        stakingDate: Date,
        lastClaimDate: Date,
        totalClaimed: { type: Number, default: 0 }
    },
    presale: {
        tokensBought: { type: Number, default: 0 },
        totalInvested: { type: Number, default: 0 },
        purchases: [{
            amount: Number,
            price: Number,
            date: Date
        }]
    },
    airdrop: {
        claimed: { type: Boolean, default: false },
        claimDate: Date,
        amount: { type: Number, default: 0 }
    },
    transactions: [{
        type: { type: String },
        amount: { type: Number },
        status: { type: String },
        hash: String,
        date: { type: Date, default: Date.now }
    }],
    analytics: {
        lastLogin: { type: Date, default: Date.now },
        loginCount: { type: Number, default: 1 },
        ipHistory: [{
            ip: String,
            userAgent: String,
            date: { type: Date, default: Date.now }
        }],
        referralCode: String,
        referredBy: String,
        referralCount: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Indexes for better query performance
userSchema.index({ 'analytics.lastLogin': -1 });
userSchema.index({ 'analytics.referralCode': 1 });

const User = mongoose.model('User', userSchema);

// Enhanced API Routes
app.post('/api/user/connect', validateUser, async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const { ip, userAgent } = req.clientInfo;
        
        let user = await User.findOne({ walletAddress });
        
        if (!user) {
            // Generate unique referral code
            const referralCode = generateReferralCode();
            
            user = new User({
                walletAddress,
                analytics: {
                    referralCode,
                    ipHistory: [{ ip, userAgent }]
                }
            });
        } else {
            // Update analytics
            user.analytics.loginCount += 1;
            user.analytics.lastLogin = new Date();
            user.analytics.ipHistory.push({ ip, userAgent });
        }
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { walletAddress: user.walletAddress },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ user, token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/user/:walletAddress', async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.walletAddress });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/user/update', async (req, res) => {
    try {
        const { walletAddress, balance, staking, presale, airdrop, transaction } = req.body;
        
        const user = await User.findOne({ walletAddress });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update balance if provided
        if (balance) {
            user.balance = { ...user.balance, ...balance };
        }

        // Update staking info if provided
        if (staking) {
            user.staking = { ...user.staking, ...staking };
        }

        // Update presale info if provided
        if (presale) {
            user.presale = { ...user.presale, ...presale };
        }

        // Update airdrop info if provided
        if (airdrop) {
            user.airdrop = { ...user.airdrop, ...airdrop };
        }

        // Add new transaction if provided
        if (transaction) {
            user.transactions.push(transaction);
        }

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New Analytics Endpoints
app.get('/api/analytics/referrals/:code', authenticateToken, async (req, res) => {
    try {
        const referrals = await User.find({
            'analytics.referredBy': req.params.code
        }).select('walletAddress analytics.lastLogin');
        
        res.json(referrals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/user/:walletAddress', authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ walletAddress: req.params.walletAddress })
            .select('-analytics.ipHistory');
            
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Calculate additional analytics
        const analytics = {
            totalValue: user.balance.sol * SOL_PRICE + user.balance.usdt,
            stakingAPY: calculateStakingAPY(user.staking),
            referralEarnings: calculateReferralEarnings(user.analytics.referralCount),
            activityScore: calculateActivityScore(user)
        };
        
        res.json({ user, analytics });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper functions
function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calculateStakingAPY(staking) {
    // APY calculation logic
}

function calculateReferralEarnings(referralCount) {
    // Referral earnings calculation logic
}

function calculateActivityScore(user) {
    // Activity score calculation based on user interactions
}

const server = http.createServer(app);
const wsManager = new WebSocketManager(server);

// Make WebSocket manager available to routes
app.ws = wsManager;

// Start WebSocket price updates
wsManager.startPriceUpdates();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 