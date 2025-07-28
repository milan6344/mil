class UIComponents {
    // Chart configurations
    static initializeCharts() {
        // Portfolio Performance Chart
        const portfolioCtx = document.getElementById('portfolioChart').getContext('2d');
        new Chart(portfolioCtx, {
            type: 'line',
            data: {
                labels: [], // Will be populated with dates
                datasets: [{
                    label: 'Portfolio Value',
                    borderColor: '#4F46E5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    data: []
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `$${context.parsed.y.toFixed(2)}`
                        }
                    }
                }
            }
        });

        // Staking Distribution Chart
        const stakingCtx = document.getElementById('stakingDistChart').getContext('2d');
        new Chart(stakingCtx, {
            type: 'doughnut',
            data: {
                labels: ['Staked', 'Rewards', 'Available'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#4F46E5',
                        '#10B981',
                        '#6B7280'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Interactive Features
    static initializeInteractiveFeatures() {
        // Tooltip initialization
        const tooltips = document.querySelectorAll('[data-tooltip]');
        tooltips.forEach(element => {
            tippy(element, {
                content: element.getAttribute('data-tooltip'),
                placement: 'top'
            });
        });

        // Sortable tables
        const tables = document.querySelectorAll('.sortable-table');
        tables.forEach(table => {
            new Sortable(table, {
                header: '.sortable-header',
                animation: 150
            });
        });

        // Search functionality
        const searchInput = document.getElementById('searchTransactions');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleTransactionSearch);
        }
    }

    // Mobile responsiveness enhancements
    static initializeMobileFeatures() {
        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        
        mobileMenuBtn?.addEventListener('click', () => {
            mobileMenu.classList.toggle('translate-x-0');
            mobileMenu.classList.toggle('-translate-x-full');
        });

        // Swipeable cards on mobile
        const cardContainer = document.querySelector('.card-container');
        if (cardContainer && window.innerWidth < 768) {
            new Swiper(cardContainer, {
                direction: 'horizontal',
                loop: false,
                pagination: {
                    el: '.swiper-pagination'
                }
            });
        }

        // Responsive tables
        const tables = document.querySelectorAll('.responsive-table');
        tables.forEach(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
            const cells = table.querySelectorAll('td');
            
            cells.forEach((cell, index) => {
                cell.setAttribute('data-label', headers[index % headers.length]);
            });
        });
    }

    // Data visualization updates
    static updateCharts(data) {
        // Update portfolio chart
        const portfolioChart = Chart.getChart('portfolioChart');
        if (portfolioChart) {
            portfolioChart.data.labels = data.dates;
            portfolioChart.data.datasets[0].data = data.values;
            portfolioChart.update();
        }

        // Update staking distribution
        const stakingChart = Chart.getChart('stakingDistChart');
        if (stakingChart) {
            stakingChart.data.datasets[0].data = [
                data.staked,
                data.rewards,
                data.available
            ];
            stakingChart.update();
        }
    }

    // Interactive transaction search
    static handleTransactionSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const transactions = document.querySelectorAll('#transactionHistory tr');
        
        transactions.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    // Progress bar animations
    static animateProgress(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.style.width = '0%';
        setTimeout(() => {
            element.style.width = `${value}%`;
        }, 100);
    }

    // Toast notifications with animations
    static showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        toast.className = `toast toast-${type} animate-slide-in`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
            </div>
            <div class="toast-content">${message}</div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        toastContainer.appendChild(toast);
        
        // Setup close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Auto remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
    }

    static removeToast(toast) {
        toast.classList.replace('animate-slide-in', 'animate-slide-out');
        setTimeout(() => toast.remove(), 300);
    }

    // Loading state management
    static showLoading(message = 'Loading...', subtext = '') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        const subText = document.getElementById('loadingSubtext');
        
        text.textContent = message;
        subText.textContent = subtext;
        overlay.style.display = 'flex';
    }

    static hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    static showModal(title, content, actions = []) {
        const modalContainer = document.getElementById('modalContainer');
        const modal = document.createElement('div');
        
        modal.className = 'modal animate-scale-in';
        modal.innerHTML = `
            <div class="modal-content glass-card">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">${content}</div>
                <div class="modal-footer">
                    ${actions.map(action => `
                        <button class="btn-${action.type}" data-action="${action.id}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        modalContainer.innerHTML = '';
        modalContainer.appendChild(modal);
        modalContainer.style.display = 'flex';

        // Setup close button
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.hideModal();
        });

        // Setup action buttons
        actions.forEach(action => {
            modal.querySelector(`[data-action="${action.id}"]`).addEventListener(
                'click', 
                action.handler
            );
        });
    }

    static hideModal() {
        const modalContainer = document.getElementById('modalContainer');
        const modal = modalContainer.querySelector('.modal');
        
        if (modal) {
            modal.classList.replace('animate-scale-in', 'animate-scale-out');
            setTimeout(() => {
                modalContainer.style.display = 'none';
                modalContainer.innerHTML = '';
            }, 300);
        }
    }

    static updateTable(tableId, data, columns) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = data.map(row => `
            <tr>
                ${columns.map(col => `
                    <td class="${col.className || ''}">${
                        col.formatter ? col.formatter(row[col.key]) : row[col.key]
                    }</td>
                `).join('')}
            </tr>
        `).join('');
    }

    static getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }
}

// Initialize components
document.addEventListener('DOMContentLoaded', () => {
    UIComponents.initializeCharts();
    UIComponents.initializeInteractiveFeatures();
    UIComponents.initializeMobileFeatures();
});

// Export for use in other files
export default UIComponents; 