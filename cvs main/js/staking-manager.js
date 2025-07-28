import config from './config.js';
import UIComponents from './components.js';

class StakingManager {
    constructor(walletConnector) {
        this.walletConnector = walletConnector;
        this.stakingData = {
            stakedAmount: 0,
            rewards: 0,
            lastStakeTime: null,
            stakingPeriod: 0
        };
    }

    async initialize() {
        try {
            await this.loadStakingData();
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error('Staking initialization error:', error);
            return false;
        }
    }

    async loadStakingData() {
        try {
            const response = await fetch(
                `${config.API_BASE_URL}/staking/${this.walletConnector.address}`
            );
            if (!response.ok) throw new Error('Failed to load staking data');
            
            this.stakingData = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Load staking data error:', error);
            throw error;
        }
    }

    setupEventListeners() {
        document.getElementById('stakeButton')?.addEventListener('click', () => {
            this.handleStake();
        });

        document.getElementById('unstakeButton')?.addEventListener('click', () => {
            this.handleUnstake();
        });

        document.getElementById('claimRewardsButton')?.addEventListener('click', () => {
            this.handleClaimRewards();
        });
    }

    async handleStake() {
        try {
            UIComponents.showLoading('Processing stake...');
            
            const amountInput = document.getElementById('stakeAmount');
            const amount = parseFloat(amountInput.value);

            if (isNaN(amount) || amount <= 0) {
                throw new Error('Invalid stake amount');
            }

            if (amount < config.MIN_STAKE_AMOUNT) {
                throw new Error(`Minimum stake amount is ${config.MIN_STAKE_AMOUNT} USDT`);
            }

            // Call smart contract
            const transaction = await this.walletConnector.provider.stake(amount);
            
            // Update backend
            await this.updateStakingBackend(amount, transaction.signature);
            
            // Update UI
            this.stakingData.stakedAmount += amount;
            this.updateUI();
            
            UIComponents.showToast('Stake successful', 'success');
            amountInput.value = '';
        } catch (error) {
            console.error('Stake error:', error);
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async handleUnstake() {
        try {
            UIComponents.showLoading('Processing unstake...');
            
            const amountInput = document.getElementById('unstakeAmount');
            const amount = parseFloat(amountInput.value);

            if (isNaN(amount) || amount <= 0) {
                throw new Error('Invalid unstake amount');
            }

            if (amount > this.stakingData.stakedAmount) {
                throw new Error('Insufficient staked amount');
            }

            // Call smart contract
            const transaction = await this.walletConnector.provider.unstake(amount);
            
            // Update backend
            await this.updateStakingBackend(-amount, transaction.signature);
            
            // Update UI
            this.stakingData.stakedAmount -= amount;
            this.updateUI();
            
            UIComponents.showToast('Unstake successful', 'success');
            amountInput.value = '';
        } catch (error) {
            console.error('Unstake error:', error);
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async handleClaimRewards() {
        try {
            UIComponents.showLoading('Claiming rewards...');
            
            if (this.stakingData.rewards <= 0) {
                throw new Error('No rewards available to claim');
            }

            // Call smart contract
            const transaction = await this.walletConnector.provider.claimRewards();
            
            // Update backend
            await this.updateRewardsBackend(transaction.signature);
            
            // Update UI
            const claimedAmount = this.stakingData.rewards;
            this.stakingData.rewards = 0;
            this.updateUI();
            
            UIComponents.showToast(`Successfully claimed ${claimedAmount} USDT`, 'success');
        } catch (error) {
            console.error('Claim rewards error:', error);
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async updateStakingBackend(amount, transactionHash) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/staking/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.walletConnector.getAuthToken()}`
                },
                body: JSON.stringify({
                    walletAddress: this.walletConnector.address,
                    amount,
                    transactionHash,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error('Failed to update staking data');
            
            return await response.json();
        } catch (error) {
            console.error('Update staking backend error:', error);
            throw error;
        }
    }

    updateUI() {
        // Update staked amount
        const stakedAmountElement = document.getElementById('stakedAmount');
        if (stakedAmountElement) {
            stakedAmountElement.textContent = `${this.stakingData.stakedAmount.toFixed(2)} USDT`;
        }

        // Update rewards
        const rewardsElement = document.getElementById('stakingRewards');
        if (rewardsElement) {
            rewardsElement.textContent = `${this.stakingData.rewards.toFixed(2)} USDT`;
        }

        // Update APY
        const apyElement = document.getElementById('stakingApy');
        if (apyElement) {
            apyElement.textContent = config.STAKING_APY.toString();
        }

        // Update progress bar
        const progressBar = document.getElementById('stakingProgressBar');
        if (progressBar) {
            const progress = (this.stakingData.stakingPeriod / (30 * 24 * 60 * 60)) * 100;
            UIComponents.animateProgress('stakingProgressBar', progress);
        }

        // Update next reward countdown
        this.updateRewardCountdown();
    }

    updateRewardCountdown() {
        const nextRewardElement = document.getElementById('nextReward');
        if (!nextRewardElement || !this.stakingData.lastStakeTime) return;

        const now = new Date().getTime();
        const lastStakeTime = new Date(this.stakingData.lastStakeTime).getTime();
        const nextRewardTime = lastStakeTime + (24 * 60 * 60 * 1000); // 24 hours
        const timeLeft = nextRewardTime - now;

        if (timeLeft <= 0) {
            nextRewardElement.textContent = 'Ready to claim';
            return;
        }

        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        nextRewardElement.textContent = `${hours}h ${minutes}m`;
    }

    // WebSocket update handler
    handleUpdate(data) {
        this.stakingData = { ...this.stakingData, ...data };
        this.updateUI();
    }
}

export default StakingManager; 