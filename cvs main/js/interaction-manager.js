import ConfigManager from './config-manager.js';
import UIComponents from './components.js';

class InteractionManager {
    constructor() {
        this.activeModals = new Set();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Global click handler
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.hasAttribute('data-form-handler')) {
                e.preventDefault();
                this.handleFormSubmission(e.target);
            }
        });

        // Custom events
        document.addEventListener('app:showToast', (e) => {
            this.showToast(e.detail);
        });

        document.addEventListener('app:showModal', (e) => {
            this.showModal(e.detail);
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    handleGlobalClick(e) {
        // Handle dropdown toggles
        if (e.target.matches('[data-dropdown-toggle]')) {
            this.toggleDropdown(e.target);
        }

        // Handle tab switching
        if (e.target.matches('[data-tab]')) {
            this.switchTab(e.target);
        }

        // Handle collapsible sections
        if (e.target.matches('[data-collapse]')) {
            this.toggleCollapse(e.target);
        }
    }

    async handleFormSubmission(form) {
        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const handler = form.getAttribute('data-form-handler');

            UIComponents.showLoading('Processing...');

            const response = await this[handler](data);
            
            UIComponents.hideLoading();
            UIComponents.showToast({
                message: 'Operation successful',
                type: 'success'
            });

            return response;
        } catch (error) {
            UIComponents.hideLoading();
            UIComponents.showToast({
                message: error.message,
                type: 'error'
            });
        }
    }

    toggleDropdown(trigger) {
        const targetId = trigger.getAttribute('data-dropdown-toggle');
        const target = document.getElementById(targetId);
        
        if (!target) return;

        const isVisible = target.classList.contains('show');
        
        // Hide all other dropdowns
        document.querySelectorAll('.dropdown-menu.show')
            .forEach(menu => menu.classList.remove('show'));

        // Toggle target dropdown
        target.classList.toggle('show', !isVisible);
        
        // Position dropdown
        if (!isVisible) {
            const rect = trigger.getBoundingClientRect();
            target.style.top = `${rect.bottom}px`;
            target.style.left = `${rect.left}px`;
        }
    }

    switchTab(tab) {
        const tabGroup = tab.closest('[data-tab-group]');
        const targetId = tab.getAttribute('data-tab');
        
        if (!tabGroup || !targetId) return;

        // Update tab states
        tabGroup.querySelectorAll('[data-tab]')
            .forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update content visibility
        const contents = document.querySelectorAll(`[data-tab-content="${tabGroup.getAttribute('data-tab-group')}"]`);
        contents.forEach(content => {
            content.classList.toggle('hidden', content.id !== targetId);
        });
    }

    toggleCollapse(trigger) {
        const targetId = trigger.getAttribute('data-collapse');
        const target = document.getElementById(targetId);
        
        if (!target) return;

        const isCollapsed = target.classList.contains('collapsed');
        
        // Toggle collapse state
        target.classList.toggle('collapsed', !isCollapsed);
        
        // Animate height
        if (isCollapsed) {
            target.style.height = `${target.scrollHeight}px`;
        } else {
            target.style.height = `${target.scrollHeight}px`;
            // Force reflow
            target.offsetHeight;
            target.style.height = '0px';
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.setAttribute('data-theme', newTheme);
        ConfigManager.set('UI.THEME', newTheme);
        
        // Dispatch theme change event
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: newTheme }
        }));
    }
}

export default new InteractionManager(); 