import config from './config.js';

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.timeframe = '1d';
        this.chartData = {
            portfolio: [],
            staking: [],
            prices: []
        };
    }

    async initialize() {
        try {
            // Initialize portfolio chart
            const portfolioCtx = document.getElementById('portfolioChart').getContext('2d');
            this.charts.set('portfolio', this.createPortfolioChart(portfolioCtx));

            // Load initial data
            await this.loadChartData();
            this.updateCharts();

            return true;
        } catch (error) {
            console.error('Chart initialization error:', error);
            return false;
        }
    }

    createPortfolioChart(ctx) {
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: [],
                        borderColor: '#4F46E5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Staking Returns',
                        data: [],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: value => `$${value.toLocaleString()}`
                        }
                    }
                }
            }
        });
    }

    async loadChartData() {
        try {
            const response = await fetch(
                `${config.API_BASE_URL}/charts?timeframe=${this.timeframe}`
            );
            if (!response.ok) throw new Error('Failed to load chart data');
            
            const data = await response.json();
            this.chartData = data;
        } catch (error) {
            console.error('Load chart data error:', error);
            throw error;
        }
    }

    updateCharts() {
        const portfolioChart = this.charts.get('portfolio');
        if (!portfolioChart) return;

        portfolioChart.data.labels = this.chartData.portfolio.map(d => d.timestamp);
        portfolioChart.data.datasets[0].data = this.chartData.portfolio.map(d => d.value);
        portfolioChart.data.datasets[1].data = this.chartData.staking.map(d => d.value);
        portfolioChart.update();
    }

    async changeTimeframe(timeframe) {
        this.timeframe = timeframe;
        await this.loadChartData();
        this.updateCharts();
    }

    // Update price data
    async updatePrices() {
        try {
            const response = await fetch(`${config.API_BASE_URL}/prices`);
            if (!response.ok) throw new Error('Failed to load price data');
            
            const data = await response.json();
            
            // Update price displays
            document.getElementById('solPrice').textContent = data.sol.toFixed(2);
            document.getElementById('cvtPrice').textContent = data.cvt.toFixed(4);
            
            // Update price changes
            this.updatePriceChange('solChange', data.sol_change);
            this.updatePriceChange('cvtChange', data.cvt_change);
        } catch (error) {
            console.error('Price update error:', error);
        }
    }

    updatePriceChange(elementId, change) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const value = change.toFixed(2);
        element.textContent = `${value}%`;
        element.className = `text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`;
    }
}

export default ChartManager; 