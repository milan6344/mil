class StakingManager {
    constructor() {
        this.usdtContract = null;
        this.stakingContract = null;
        this.userBalance = 0;
        this.stakedAmount = 0;
        this.rewards = 0;
    }

    async initialize() {
        try {
            // Initialize contracts
            await this.setupContracts();
            await this.updateBalances();
            this.setupEventListeners();
            return true;
        } catch (error) {
            console.error("Staking initialization error:", error);
            return false;
        }
    }

    async setupContracts() {
        // Setup USDT and Staking contracts
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        this.usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
        this.stakingContract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer);
    }

    async updateBalances() {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            this.userBalance = await this.usdtContract.balanceOf(accounts[0]);
            this.stakedAmount = await this.stakingContract.stakedBalance(accounts[0]);
            this.rewards = await this.stakingContract.pendingRewards(accounts[0]);
            
            this.updateUI();
        }
    }

    async stake(amount) {
        try {
            document.getElementById('loadingOverlay').classList.remove('hidden');
            
            if (!await this.checkAllowance(amount)) {
                const approval = await this.usdtContract.approve(
                    STAKING_CONTRACT_ADDRESS,
                    amount
                );
                if (!await this.validateTransaction(approval)) {
                    throw new Error('Approval failed');
                }
            }

            const stake = await this.stakingContract.stake(amount);
            if (!await this.validateTransaction(stake)) {
                throw new Error('Staking failed');
            }

            await this.updateBalances();
            this.showToast('Success', 'Successfully staked USDT!');
            return true;
        } catch (error) {
            console.error("Staking error:", error);
            this.showToast('Error', error.message);
            return false;
        } finally {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }
    }

    async unstake() {
        try {
            const unstake = await this.stakingContract.unstake();
            await unstake.wait();

            await this.updateBalances();
            this.showToast('Success', 'Successfully unstaked USDT!');
            return true;
        } catch (error) {
            console.error("Unstaking error:", error);
            this.showToast('Error', error.message);
            return false;
        }
    }

    async harvestRewards() {
        try {
            const harvest = await this.stakingContract.harvestRewards();
            await harvest.wait();

            await this.updateBalances();
            this.showToast('Success', 'Successfully harvested rewards!');
            return true;
        } catch (error) {
            console.error("Harvest error:", error);
            this.showToast('Error', error.message);
            return false;
        }
    }

    updateUI() {
        // Update balance displays
        document.getElementById('usdtBalance').textContent = `${ethers.utils.formatUnits(this.userBalance, 6)} USDT`;
        document.getElementById('userStaked').textContent = `${ethers.utils.formatUnits(this.stakedAmount, 6)} USDT`;
        document.getElementById('earnedRewards').textContent = `${ethers.utils.formatUnits(this.rewards, 6)} USDT`;

        // Update button states
        const stakeButton = document.getElementById('stakeButton');
        const unstakeButton = document.getElementById('unstakeButton');
        const harvestButton = document.getElementById('harvestButton');

        stakeButton.disabled = this.userBalance.isZero();
        unstakeButton.disabled = this.stakedAmount.isZero();
        harvestButton.disabled = this.rewards.isZero();
    }

    setupEventListeners() {
        document.getElementById('stakingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = ethers.utils.parseUnits(document.getElementById('stakeAmount').value, 6);
            await this.stake(amount);
        });

        document.getElementById('unstakeButton').addEventListener('click', async () => {
            await this.unstake();
        });

        document.getElementById('harvestButton').addEventListener('click', async () => {
            await this.harvestRewards();
        });

        document.getElementById('maxButton').addEventListener('click', () => {
            document.getElementById('stakeAmount').value = ethers.utils.formatUnits(this.userBalance, 6);
        });
    }

    async validateTransaction(tx) {
        try {
            const receipt = await tx.wait();
            if (receipt.status === 0) {
                throw new Error('Transaction failed');
            }
            return true;
        } catch (error) {
            console.error('Transaction validation error:', error);
            return false;
        }
    }

    async checkAllowance(amount) {
        const allowance = await this.usdtContract.allowance(
            this.walletAddress,
            STAKING_CONTRACT_ADDRESS
        );
        return allowance.gte(amount);
    }
}

// Initialize staking manager
const stakingManager = new StakingManager();
document.addEventListener('DOMContentLoaded', () => {
    stakingManager.initialize();
}); 