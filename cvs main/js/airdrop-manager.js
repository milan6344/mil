import config from './config.js';
import UIComponents from './components.js';

class AirdropManager {
    constructor(walletConnector) {
        this.walletConnector = walletConnector;
        this.airdropData = {
            eligible: false,
            claimed: false,
            amount: config.AIRDROP_AMOUNT,
            claimDeadline: null,
            referralCode: null,
            referralCount: 0
        };
    }

    async initialize() {
        try {
            await this.loadAirdropData();
            this.setupEventListeners();
            this.startDeadlineCountdown();
            return true;
        } catch (error) {
            console.error('Airdrop initialization error:', error);
            return false;
        }
    }

    async loadAirdropData() {
        try {
            const response = await fetch(
                `${config.API_BASE_URL}/airdrop/${this.walletConnector.address}`
            );
            if (!response.ok) throw new Error('Failed to load airdrop data');
            
            this.airdropData = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Load airdrop data error:', error);
            throw error;
        }
    }

    setupEventListeners() {
        document.getElementById('claimAirdropButton')?.addEventListener('click', () => {
            this.handleClaim();
        });

        document.getElementById('shareReferralButton')?.addEventListener('click', () => {
            this.handleShareReferral();
        });
    }

    startDeadlineCountdown() {
        if (!this.airdropData.claimDeadline) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            const deadline = new Date(this.airdropData.claimDeadline).getTime();
            const timeLeft = deadline - now;

            const countdownElement = document.getElementById('airdropTimeRemaining');
            if (!countdownElement) return;

            if (timeLeft <= 0) {
                countdownElement.textContent = 'Expired';
                return;
            }

            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            countdownElement.textContent = `${days}d ${hours}h ${minutes}m`;
        };

        updateCountdown();
        setInterval(updateCountdown, 60000); // Update every minute
    }

    async handleClaim() {
        try {
            if (!this.airdropData.eligible) {
                throw new Error('Not eligible for airdrop');
            }

            if (this.airdropData.claimed) {
                throw new Error('Airdrop already claimed');
            }

            UIComponents.showLoading('Claiming airdrop...');

            // Call smart contract
            const transaction = await this.walletConnector.provider.claimAirdrop();
            
            // Update backend
            await this.updateAirdropBackend(transaction.signature);
            
            // Update UI
            this.airdropData.claimed = true;
            this.updateUI();
            
            UIComponents.showToast(`Successfully claimed ${this.airdropData.amount} CVT`, 'success');
        } catch (error) {
            console.error('Claim airdrop error:', error);
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async handleShareReferral() {
        try {
            const referralLink = `${window.location.origin}?ref=${this.airdropData.referralCode}`;
            
            await navigator.clipboard.writeText(referralLink);
            UIComponents.showToast('Referral link copied to clipboard', 'success');
            
            // Share on social media if available
            if (navigator.share) {
                await navigator.share({
                    title: 'Join Coinverse',
                    text: 'Join Coinverse and get free CVT tokens!',
                    url: referralLink
                });
            }
        } catch (error) {
            console.error('Share referral error:', error);
            UIComponents.showToast('Failed to share referral link', 'error');
        }
    }

    async updateAirdropBackend(transactionHash) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/airdrop/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.walletConnector.getAuthToken()}`
                },
                body: JSON.stringify({
                    walletAddress: this.walletConnector.address,
                    transactionHash,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error('Failed to update airdrop data');
            
            return await response.json();
        } catch (error) {
            console.error('Update airdrop backend error:', error);
            throw error;
        }
    }

    updateUI() {
        // Update eligibility status
        const statusElement = document.getElementById('airdropStatus');
        if (statusElement) {
            if (this.airdropData.claimed) {
                statusElement.textContent = 'CLAIMED';
                statusElement.className = 'text-gray-500';
            } else if (this.airdropData.eligible) {
                statusElement.textContent = 'ELIGIBLE';
                statusElement.className = 'text-green-500';
            } else {
                statusElement.textContent = 'NOT ELIGIBLE';
                statusElement.className = 'text-red-500';
            }
        }

        // Update amount
        const amountElement = document.getElementById('airdropAmount');
        if (amountElement) {
            amountElement.textContent = `${this.airdropData.amount} CVT`;
        }

        // Update claim button
        const claimButton = document.getElementById('claimAirdropButton');
        if (claimButton) {
            claimButton.disabled = !this.airdropData.eligible || this.airdropData.claimed;
            claimButton.textContent = this.airdropData.claimed ? 'Claimed' : 'Claim Airdrop';
        }

        // Update referral section
        const referralCodeElement = document.getElementById('referralCode');
        if (referralCodeElement) {
            referralCodeElement.textContent = this.airdropData.referralCode;
        }

        const referralCountElement = document.getElementById('referralCount');
        if (referralCountElement) {
            referralCountElement.textContent = this.airdropData.referralCount;
        }
    }

    // WebSocket update handler
    handleUpdate(data) {
        this.airdropData = { ...this.airdropData, ...data };
        this.updateUI();
    }
}

export default AirdropManager; 