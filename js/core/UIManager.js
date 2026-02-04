/**
 * UI Manager
 * Handles all DOM interactions and UI state management
 */

export default class UIManager {
    /**
     * Creates a new UIManager instance
     * @param {Object} elements - Object containing DOM element references
     */
    constructor(elements) {
        this.elements = elements;
        this.currentSection = null;
    }

    /**
     * Show a specific section and hide others
     * @param {string} sectionName - Name of section to show ('upload', 'processing', 'examples')
     */
    showSection(sectionName) {
        const sections = {
            upload: this.elements.uploadSection,
            processing: this.elements.processingSection,
            examples: this.elements.examplesSection,
        };

        // Hide all sections
        Object.values(sections).forEach(section => section?.classList.add('hidden'));

        // Show requested section
        if (sections[sectionName]) {
            sections[sectionName].classList.remove('hidden');
            this.currentSection = sectionName;
        }

        // Show/hide header based on section
        if (sectionName === 'processing' && this.elements.appHeader) {
            this.elements.appHeader.classList.remove('hidden');
        }
    }

    /**
     * Update dice statistics display
     * @param {Object} diceLevels - Array of dice level values
     * @param {number} gridWidth - Grid width
     * @param {number} gridHeight - Grid height
     */
    updateDiceStats(diceLevels, gridWidth, gridHeight) {
        if (!this.elements.diceStatsList) return;

        const stats = { total: diceLevels.length, byLevel: [0, 0, 0, 0, 0, 0] };
        for (let i = 0; i < diceLevels.length; i++) {
            const level = diceLevels[i];
            stats.byLevel[level - 1]++;
        }

        this.elements.diceStatsList.innerHTML = '';
        for (let i = 1; i <= 6; i++) {
            const count = stats.byLevel[i - 1];
            const percentage = ((count / stats.total) * 100).toFixed(1);

            const li = document.createElement('li');
            li.className = 'flex justify-between items-center';
            li.innerHTML = `
        <span class="flex items-center gap-2">
          <img src="assets/dice/dice-${i}.png" alt="Dice ${i}" class="w-6 h-6">
          <span>Dice ${i}</span>
        </span>
        <span class="text-gray-400">${count} (${percentage}%)</span>
      `;
            this.elements.diceStatsList.appendChild(li);
        }
    }

    /**
     * Update dimension and total dice info
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     * @param {number} total - Total dice count
     */
    updateInfo(width, height, total) {
        if (this.elements.dimensionsInfo) {
            this.elements.dimensionsInfo.textContent = `${width} × ${height}`;
        }
        if (this.elements.totalDiceInfo) {
            this.elements.totalDiceInfo.textContent = total.toLocaleString();
        }
    }

    /**
     * Toggle loading overlay
     * @param {boolean} isLoading - True to show loading, false to hide
     * @param {string} message - Optional loading message
     */
    setLoading(isLoading, message = 'Processing...') {
        if (!this.elements.loadingOverlay) return;

        if (isLoading) {
            this.elements.loadingOverlay.classList.remove('hidden');
            const messageEl = this.elements.loadingOverlay.querySelector('.loading-message');
            if (messageEl) messageEl.textContent = message;
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showError(message) {
        alert(message); // TODO: Replace with better UI notification
        console.error(message);
    }

    /**
     * Update slider value display
     * @param {HTMLElement} valueElement - Element to update
     * @param {number} value - Value to display
     */
    updateSliderValue(valueElement, value) {
        if (valueElement) {
            valueElement.textContent = value;
        }
    }

    /**
     * Update color selector highlighting
     * @param {string} containerId - Container element ID
     * @param {string} activeColor - Currently active color hex code
     */
    updateColorSelectors(containerId, activeColor) {
        const buttons = document.querySelectorAll(`#${containerId} button`);
        buttons.forEach((btn) => {
            if (btn.getAttribute('data-color') === activeColor) {
                btn.classList.add('ring-2', 'ring-primary');
            } else {
                btn.classList.remove('ring-2', 'ring-primary');
            }
        });
    }

    /**
     * Enable or disable export buttons
     * @param {boolean} enabled - True to enable, false to disable
     */
    setExportButtonsEnabled(enabled) {
        const exportButtons = [
            this.elements.downloadPdfBtn,
            this.elements.export3dPrintBtn,
            this.elements.exportMultiPlateBtn,
            this.elements.downloadScadBtn,
        ];

        exportButtons.forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });
    }

    /**
     * Show/hide an element
     * @param {HTMLElement} element - Element to toggle
     * @param {boolean} show - True to show, false to hide
     */
    toggleElement(element, show) {
        if (!element) return;
        if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }

    /**
     * Set button loading state
     * @param {HTMLElement} button - Button element
     * @param {boolean} isLoading - True if loading
     * @param {string} originalHtml - Original button HTML to restore
     * @returns {string} Current button HTML (to save for later)
     */
    setButtonLoading(button, isLoading, originalHtml = null) {
        if (!button) return '';

        if (isLoading) {
            const currentHtml = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `
        <svg class="animate-spin h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processing...
      `;
            return currentHtml;
        } else {
            button.disabled = false;
            if (originalHtml) {
                button.innerHTML = originalHtml;
            }
            // Refresh icons if lucide is available
            if (window.lucide) {
                window.lucide.createIcons();
            }
            return '';
        }
    }
}
