let provider;
let signer;
let contract;
let usdtContract;

// Contract addresses and ABIs would be defined here
const TOKEN_CONTRACT_ADDRESS = "YOUR_TOKEN_CONTRACT_ADDRESS";
const USDT_CONTRACT_ADDRESS = "USDT_CONTRACT_ADDRESS";
const TOKEN_ABI = [];
const USDT_ABI = [];

async function initializeBuyPage() {
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_ABI, signer);
        usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);

        await updateTokenPrice();
        await updateUserBalance();
        setupEventListeners();
        loadPurchaseHistory();
    } catch (error) {
        console.error('Error initializing buy page:', error);
    }
}

async function buyWithUsdt() {
    try {
        const amount = document.getElementById('usdtAmount').value;
        const amountWei = ethers.utils.parseEther(amount);

        // First approve USDT spending
        const approveTx = await usdtContract.approve(TOKEN_CONTRACT_ADDRESS, amountWei);
        await approveTx.wait();

        // Then buy tokens
        const buyTx = await contract.buyWithUSDT(amountWei);
        await buyTx.wait();

        // Update UI
        await updateUserBalance();
        loadPurchaseHistory();
    } catch (error) {
        console.error('Error buying with USDT:', error);
    }
}

async function buyWithEth() {
    try {
        const amount = document.getElementById('ethAmount').value;
        const amountWei = ethers.utils.parseEther(amount);

        // Buy tokens with ETH
        const buyTx = await contract.buyWithETH({ value: amountWei });
        await buyTx.wait();

        // Update UI
        await updateUserBalance();
        loadPurchaseHistory();
    } catch (error) {
        console.error('Error buying with ETH:', error);
    }
}

function setupEventListeners() {
    document.getElementById('buyWithUsdt').addEventListener('click', buyWithUsdt);
    document.getElementById('buyWithEth').addEventListener('click', buyWithEth);
    
    // Add input event listeners for price calculations
    document.getElementById('usdtAmount').addEventListener('input', calculateTokenAmount);
    document.getElementById('ethAmount').addEventListener('input', calculateTokenAmountFromEth);
}

// Initialize page when loaded
window.addEventListener('load', initializeBuyPage); 