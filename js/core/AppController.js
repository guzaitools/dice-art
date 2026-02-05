/**
 * Application Controller
 * Main orchestrator that coordinates all modules and manages application workflow
 */

import ImageProcessor from '../imageProcessor.js';
import DiceRenderer from '../diceRenderer.js';
import ExporterFactory from '../exporters/ExporterFactory.js';
import SettingsManager from './SettingsManager.js';
import UIManager from './UIManager.js';
import * as CONST from '../constants.js';
import { validateFile } from '../utils/validators.js';

export default class AppController {
    /**
     * Creates a new AppController instance
     * @param {Object} options - Configuration options
     * @param {Object} options.domElements - DOM element references
     */
    constructor(options = {}) {
        // Initialize core modules
        this.imageProcessor = new ImageProcessor();
        this.diceRenderer = new DiceRenderer();
        this.exporterFactory = new ExporterFactory();

        // Initialize managers
        const defaults = {
            gridSize: CONST.DEFAULT_GRID_SIZE,
            brightness: CONST.DEFAULT_BRIGHTNESS,
            contrast: CONST.DEFAULT_CONTRAST,
            dieColor: CONST.DEFAULT_DIE_COLOR,
            pointColor: CONST.DEFAULT_POINT_COLOR,
            sourceGrayscale: true,
            diceSize: CONST.DEFAULT_DICE_SIZE_MM,
            invertOrder: false,
            invertColor: false,
        };

        this.settingsManager = new SettingsManager(defaults);
        this.uiManager = new UIManager(options.domElements || {});

        // Application state
        this.lastResult = null;

        // Performance: Cache for processed results
        this.resultCache = new Map();
        this.maxCacheSize = CONST.MAX_CACHE_SIZE;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Dice Art application...');

        try {
            // Load dice images
            await this.diceRenderer.loadDiceImages();
            console.log('Dice images loaded successfully');

            // Load saved settings
            const settings = this.settingsManager.loadSettings();

            // Apply initial colors to renderer
            this.diceRenderer.generateTintedDice(settings.dieColor, settings.pointColor);

            return true;
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.uiManager.showError('Error al cargar las imágenes de dados.');
            return false;
        }
    }

    /**
     * Process an uploaded image file
     * @param {File} file - Image file to process
     * @returns {Promise<Object>} Processing result
     */
    async processImage(file) {
        try {
            // Validate file
            validateFile(file);

            // Show processing UI
            this.uiManager.showSection('processing');
            this.uiManager.setLoading(true, 'Loading image...');

            // Load image
            const image = await this.imageProcessor.loadImage(file);

            // Get current settings
            const settings = this.settingsManager.getSettings();

            // Process image
            this.uiManager.setLoading(true, 'Processing image...');
            const result = await this.imageProcessor.processImage(
                this.uiManager.elements.originalCanvas,
                settings.gridSize,
                settings.brightness,
                settings.contrast,
                settings.sourceGrayscale
            );

            // Update dice colors
            this.diceRenderer.generateTintedDice(settings.dieColor, settings.pointColor);

            // Render dice art
            this.uiManager.setLoading(true, 'Rendering dice art...');
            await this.diceRenderer.renderDiceGridAnimated(
                this.uiManager.elements.diceCanvas,
                result.diceLevels,
                result.gridWidth,
                result.gridHeight,
                (progress) => {
                    this.uiManager.setLoading(true, `Rendering... ${progress}%`);
                }
            );

            // Update UI
            this.uiManager.updateInfo(result.gridWidth, result.gridHeight, result.totalDice);
            this.uiManager.updateDiceStats(result.diceLevels, result.gridWidth, result.gridHeight);
            this.uiManager.setExportButtonsEnabled(true);

            // Store result
            this.lastResult = result;

            this.uiManager.setLoading(false);
            return result;

        } catch (error) {
            console.error('Error processing image:', error);
            this.uiManager.setLoading(false);
            this.uiManager.showError(error.message || 'Error processing image');
            throw error;
        }
    }

    /**
   * Reprocess current image with updated settings
   */
    async reprocessImage() {
        if (!this.imageProcessor.originalImage) {
            console.warn('No image loaded to reprocess');
            return;
        }

        try {
            const settings = this.settingsManager.getSettings();
            let result;

            // Performance: Check cache for PROCESSING result (expensive part)
            // Note: Cache key excludes colors as they don't affect dice levels
            const cacheKey = this.generateCacheKey(settings);

            if (this.resultCache.has(cacheKey)) {
                console.log('Using cached processing result');
                result = this.resultCache.get(cacheKey);
            } else {
                this.uiManager.setLoading(true, 'Reprocessing...');

                // Reprocess image
                result = await this.imageProcessor.processImage(
                    this.uiManager.elements.originalCanvas,
                    settings.gridSize,
                    settings.brightness,
                    settings.contrast,
                    settings.sourceGrayscale,
                    settings.invertOrder
                );

                // Cache result
                this.cacheResult(cacheKey, result);
            }

            // RENDER STEP (Always run this, even on cache hit)

            // Update dice colors if changed (fast)
            this.diceRenderer.generateTintedDice(settings.dieColor, settings.pointColor);

            // Re-render dice art (fast-ish)
            // We use a shorter animation or no animation if it's a quick color swap? 
            // For now, keep consistent animation or maybe speed it up?
            // Let's use the standard render.
            await this.diceRenderer.renderDiceGridAnimated(
                this.uiManager.elements.diceCanvas,
                result.diceLevels,
                result.gridWidth,
                result.gridHeight
            );

            // Update UI
            await this.applyResult(result);

            this.uiManager.setLoading(false);
            return result;

        } catch (error) {
            console.error('Error reprocessing image:', error);
            this.uiManager.setLoading(false);
            this.uiManager.showError('Error reprocessing image');
            throw error;
        }
    }

    /**
     * Apply a processing result to the UI
     * @param {Object} result - Processing result
     */
    async applyResult(result) {
        this.uiManager.updateInfo(result.gridWidth, result.gridHeight, result.totalDice);
        this.uiManager.updateDiceStats(result.diceLevels, result.gridWidth, result.gridHeight);
        this.lastResult = result;
    }

    /**
     * Generate cache key from settings
     * @param {Object} settings - Current settings
     * @returns {string} Cache key
     */
    generateCacheKey(settings) {
        // Exclude colors! They affect rendering, not processing.
        return `${settings.gridSize}_${settings.brightness}_${settings.contrast}_${settings.sourceGrayscale}_${settings.invertOrder}`;
    }

    /**
     * Cache a processing result
     * @param {string} key - Cache key
     * @param {Object} result - Result to cache
     */
    cacheResult(key, result) {
        // Implement LRU: remove oldest if cache is full
        if (this.resultCache.size >= this.maxCacheSize) {
            const firstKey = this.resultCache.keys().next().value;
            this.resultCache.delete(firstKey);
        }
        this.resultCache.set(key, result);
    }

    /**
     * Reset parameters to defaults but keep image
     */
    async resetParameters() {
        const defaults = {
            gridSize: DEFAULT_GRID_SIZE,
            brightness: 0,
            contrast: 0,
            dieColor: DEFAULT_DIE_COLOR,
            pointColor: DEFAULT_POINT_COLOR,
            sourceGrayscale: true,
            diceSize: 10,
        };

        // Update all settings
        Object.entries(defaults).forEach(([key, value]) => {
            this.settingsManager.updateSetting(key, value);
        });

        // Update UI Sliders
        this.uiManager.updateSliderValue(this.uiManager.elements.gridSizeValue, defaults.gridSize);
        this.uiManager.elements.gridSizeSlider.value = defaults.gridSize;

        this.uiManager.updateSliderValue(this.uiManager.elements.brightnessValue, defaults.brightness);
        this.uiManager.elements.brightnessSlider.value = defaults.brightness;

        // Reset Toggles
        if (this.uiManager.elements.invertOrderToggle) this.uiManager.elements.invertOrderToggle.checked = defaults.invertOrder;
        if (this.uiManager.elements.invertColorToggle) this.uiManager.elements.invertColorToggle.checked = defaults.invertColor;
        if (this.uiManager.elements.sourceGrayscaleToggle) this.uiManager.elements.sourceGrayscaleToggle.checked = defaults.sourceGrayscale;

        // Reprocess if image is loaded
        if (this.imageProcessor.originalImage) {
            await this.reprocessImage();
        }
    }

    /**
     * Handle export request
     * @param {string} format - Export format ('pdf', '3mf')
     * @param {Object} options - Format-specific export options
     */
    async handleExport(format, options = {}) {
        if (!this.lastResult) {
            this.uiManager.showError('No image processed yet');
            return;
        }

        const settings = this.settingsManager.getSettings();

        // Prepare export data
        const exportData = {
            diceLevels: this.lastResult.diceLevels,
            gridWidth: this.lastResult.gridWidth,
            gridHeight: this.lastResult.gridHeight,
            diceCanvas: this.uiManager.elements.diceCanvas,
            originalCanvas: this.uiManager.elements.originalCanvas,
        };

        // Merge options with settings
        const exportOptions = {
            diceSize: settings.diceSize,
            ...options,
        };

        try {
            this.uiManager.setLoading(true, `Generating ${format.toUpperCase()}...`);
            const blob = await this.exporterFactory.export(format, exportData, exportOptions);
            this.uiManager.setLoading(false);
            console.log(`${format.toUpperCase()} export successful`);
            return blob;
        } catch (error) {
            this.uiManager.setLoading(false);
            console.error(`Error exporting ${format}:`, error);
            this.uiManager.showError(`Error generating ${format.toUpperCase()}`);
            throw error;
        }
    }

    /**
     * Update a setting and trigger reprocessing
     * @param {string} key - Setting key
     * @param {*} value - New value
     */
    async updateSetting(key, value) {
        this.settingsManager.updateSetting(key, value);

        // Reprocess if image is loaded (reprocessImage already handles setLoading)
        if (this.imageProcessor.originalImage) {
            await this.reprocessImage();
        }
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.lastResult = null;
        this.uiManager.showSection('upload');
        this.uiManager.setExportButtonsEnabled(false);
    }

    /**
     * Get current settings
     */
    getSettings() {
        return this.settingsManager.getSettings();
    }

    /**
     * Get last processing result
     */
    getLastResult() {
        return this.lastResult;
    }
    /**
     * Start over completely
     */
    async startOver() {
        // Reset settings
        await this.resetParameters();

        // Clear result
        this.lastResult = null;

        // Clear original image in processor
        this.imageProcessor.originalImage = null;
        this.imageProcessor.processedImageData = null;

        // Reset UI via manager
        this.uiManager.showSection('upload');
        // Reset file input
        if (this.uiManager.elements.fileInput) {
            this.uiManager.elements.fileInput.value = '';
        }

        // Disable export buttons
        this.uiManager.setExportButtonsEnabled(false);
    }

    /**
     * Update dice colors based on toggle
     * @param {boolean} isInverted - If true, use White background / Black pips
     */
    updateDiceColors(isInverted) {
        const newDieColor = isInverted ? '#ffffff' : '#000000';
        const newPointColor = isInverted ? '#000000' : '#ffffff';

        this.updateSetting('dieColor', newDieColor);
        this.updateSetting('pointColor', newPointColor);
        this.updateSetting('invertColor', isInverted);

        // This triggers reprocessImage -> re-render
    }
}
