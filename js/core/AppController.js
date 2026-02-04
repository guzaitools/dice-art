/**
 * Application Controller
 * Main orchestrator that coordinates all modules and manages application workflow
 */

import ImageProcessor from '../imageProcessor.js';
import DiceRenderer from '../diceRenderer.js';
import ExporterFactory from '../exporters/ExporterFactory.js';
import SettingsManager from './SettingsManager.js';
import UIManager from './UIManager.js';
import { DEFAULT_DIE_COLOR, DEFAULT_POINT_COLOR, DEFAULT_GRID_SIZE } from '../constants.js';
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
            gridSize: DEFAULT_GRID_SIZE,
            brightness: 0,
            contrast: 0,
            dieColor: DEFAULT_DIE_COLOR,
            pointColor: DEFAULT_POINT_COLOR,
            sourceGrayscale: true,
            diceSize: 10,
        };

        this.settingsManager = new SettingsManager(defaults);
        this.uiManager = new UIManager(options.domElements || {});

        // Application state
        this.lastResult = null;

        // Performance: Cache for processed results
        this.resultCache = new Map();
        this.maxCacheSize = 5;
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
            const result = this.imageProcessor.processImage(
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

            // Performance: Check cache
            const cacheKey = this.generateCacheKey(settings);
            if (this.resultCache.has(cacheKey)) {
                console.log('Using cached result');
                const cachedResult = this.resultCache.get(cacheKey);
                await this.applyResult(cachedResult);
                return cachedResult;
            }

            this.uiManager.setLoading(true, 'Reprocessing...');

            // Reprocess image
            const result = this.imageProcessor.processImage(
                this.uiManager.elements.originalCanvas,
                settings.gridSize,
                settings.brightness,
                settings.contrast,
                settings.sourceGrayscale
            );

            // Update dice colors if changed
            this.diceRenderer.generateTintedDice(settings.dieColor, settings.pointColor);

            // Re-render dice art
            await this.diceRenderer.renderDiceGridAnimated(
                this.uiManager.elements.diceCanvas,
                result.diceLevels,
                result.gridWidth,
                result.gridHeight
            );

            // Cache result
            this.cacheResult(cacheKey, result);

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
        return `${settings.gridSize}_${settings.brightness}_${settings.contrast}_${settings.sourceGrayscale}`;
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
   * Handle export request
   * @param {string} format - Export format ('pdf', '3mf', 'scad')
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
            const blob = await this.exporterFactory.export(format, exportData, exportOptions);
            console.log(`${format.toUpperCase()} export successful`);
            return blob;
        } catch (error) {
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

        // Reprocess if image is loaded
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
}
