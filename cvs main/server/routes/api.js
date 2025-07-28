const express = require('express');
const router = express.Router();
const { validateUser } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/security');

// Staking endpoints
router.post('/staking/stake', authenticateToken, validateUser, async (req, res) => {
    try {
        const { walletAddress, amount } = req.body;
        const user = await User.findOne({ walletAddress });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update staking data
        user.staking.stakedAmount += amount;
        user.staking.stakingDate = new Date();
        
        // Add transaction record
        user.transactions.push({
            type: 'stake',
            amount,
            status: 'completed',
            date: new Date()
        });

        await user.save();

        // Notify via WebSocket
        req.app.ws.updateStakingData(walletAddress);
        
        res.json({ success: true, staking: user.staking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Presale endpoints
router.post('/presale/buy', authenticateToken, validateUser, async (req, res) => {
    try {
        const { walletAddress, amount, price } = req.body;
        const user = await User.findOne({ walletAddress });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update presale data
        user.presale.tokensBought += amount;
        user.presale.totalInvested += amount * price;
        user.presale.purchases.push({
            amount,
            price,
            date: new Date()
        });

        await user.save();

        // Notify via WebSocket
        req.app.ws.sendToClient(walletAddress, {
            type: 'presale_update',
            data: user.presale
        });
        
        res.json({ success: true, presale: user.presale });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics endpoints
router.get('/analytics/leaderboard', authenticateToken, async (req, res) => {
    try {
        const leaderboard = await User.find()
            .sort({ 'staking.stakedAmount': -1 })
            .limit(10)
            .select('walletAddress staking.stakedAmount');
        
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Transaction history
router.get('/transactions/:walletAddress', authenticateToken, async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const user = await User.findOne({ walletAddress });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        const transactions = user.transactions.slice(startIndex, endIndex);
        const total = user.transactions.length;
        
        res.json({
            transactions,
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                hasMore: endIndex < total
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User statistics
router.get('/stats/:walletAddress', authenticateToken, async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const user = await User.findOne({ walletAddress });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stats = {
            totalValue: user.balance.sol * SOL_PRICE + user.balance.usdt,
            stakingAPY: calculateStakingAPY(user.staking),
            referralEarnings: calculateReferralEarnings(user.analytics.referralCount),
            activityScore: calculateActivityScore(user),
            stakingStats: {
                totalStaked: user.staking.stakedAmount,
                totalRewards: user.staking.totalClaimed,
                currentRewards: user.staking.rewards
            },
            presaleStats: {
                tokensBought: user.presale.tokensBought,
                totalInvested: user.presale.totalInvested,
                averagePrice: user.presale.totalInvested / user.presale.tokensBought
            }
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 