// Countdown Timer
function updateTimer() {
    const endDate = new Date('2024-12-31T23:59:59').getTime();
    
    function update() {
        const now = new Date().getTime();
        const distance = endDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');

        if (distance < 0) {
            clearInterval(timer);
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
        }
    }

    update();
    const timer = setInterval(update, 1000);
}

// Calculate token amount based on ETH input
function calculateTokens(event) {
    const ethAmount = event.target.value;
    const tokenRate = 10000; // 1 ETH = 10,000 TKN
    const tokenAmount = ethAmount * tokenRate;
    const resultElement = event.target.parentElement.nextElementSibling.querySelector('span');
    resultElement.textContent = `${tokenAmount.toLocaleString()} TKN`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateTimer();
    
    // Add event listener for ETH input
    const ethInput = document.querySelector('input[type="number"]');
    if (ethInput) {
        ethInput.addEventListener('input', calculateTokens);
    }

    document.getElementById('presaleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const solAmount = document.getElementById('solAmount').value;
        await walletManager.participateInPresale(solAmount);
    });

    document.getElementById('solAmount').addEventListener('input', (e) => {
        const solAmount = e.target.value;
        const usdValue = walletManager.calculateUsdValue(solAmount);
        document.getElementById('usdValue').textContent = `$${usdValue.toFixed(2)}`;
        document.getElementById('tokenEstimate').textContent = `${(usdValue * 100).toFixed(0)} TKN`; // Example rate: $1 = 100 TKN
    });

    document.getElementById('airdropButton').addEventListener('click', async () => {
        await walletManager.claimAirdrop();
    });
}); 