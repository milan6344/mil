let provider;
let signer;
let contract;

// Contract ABI and address would be defined here
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS";
const CONTRACT_ABI = [];

async function initializeDashboard() {
    try {
        // Connect to provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Update balances
        await updateBalances();
        // Load transaction history
        await loadTransactionHistory();
        // Load staking info
        await loadStakingInfo();

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

async function updateBalances() {
    try {
        const address = await signer.getAddress();
        
        // Get ETH balance
        const ethBalance = await provider.getBalance(address);
        document.getElementById('walletBalance').textContent = 
            `${ethers.utils.formatEther(ethBalance)} ETH`;

        // Get token balance
        const tokenBalance = await contract.balanceOf(address);
        document.getElementById('tokenBalance').textContent = 
            `${ethers.utils.formatEther(tokenBalance)} TKN`;

        // Get staked amount
        const stakedAmount = await contract.stakedBalance(address);
        document.getElementById('stakedAmount').textContent = 
            `${ethers.utils.formatEther(stakedAmount)} TKN`;
    } catch (error) {
        console.error('Error updating balances:', error);
    }
}

async function stake() {
    try {
        const amount = document.getElementById('stakeAmount').value;
        const amountWei = ethers.utils.parseEther(amount);
        
        // First approve the contract to spend tokens
        const approveTx = await contract.approve(CONTRACT_ADDRESS, amountWei);
        await approveTx.wait();

        // Then stake the tokens
        const stakeTx = await contract.stake(amountWei);
        await stakeTx.wait();

        // Update UI
        await updateBalances();
        await loadStakingInfo();
    } catch (error) {
        console.error('Error staking tokens:', error);
    }
}

async function unstake() {
    try {
        const unstakeTx = await contract.unstake();
        await unstakeTx.wait();

        // Update UI
        await updateBalances();
        await loadStakingInfo();
    } catch (error) {
        console.error('Error unstaking tokens:', error);
    }
}

function setupEventListeners() {
    document.getElementById('stakeButton').addEventListener('click', stake);
    document.getElementById('unstakeButton').addEventListener('click', unstake);
}

// Initialize dashboard when page loads
window.addEventListener('load', initializeDashboard); 