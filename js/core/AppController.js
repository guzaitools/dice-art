/**
 * Application Controller
 * Main orchestrator that coordinates all modules and manages application workflow
 */

import ImageProcessor from '../imageProcessor.js';
import DiceRenderer from '../diceRenderer.js';
import PDFExporter from '../pdfExporter.js';
import Exporter3MF from '../exporter3mf.js';
import ExporterSCAD from '../scadExporter.js';
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
        // Initialize modules
        this.imageProcessor = new ImageProcessor();
        this.diceRenderer = new DiceRenderer();
        this.pdfExporter = new PDFExporter();
        this.exporter3mf = new Exporter3MF();
        this.scadExporter = new ExporterSCAD();

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

            // Update UI
            this.uiManager.updateInfo(result.gridWidth, result.gridHeight, result.totalDice);
            this.uiManager.updateDiceStats(result.diceLevels, result.gridWidth, result.gridHeight);

            // Store result
            this.lastResult = result;

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
     * Handle export request
     * @param {string} type - Export type ('pdf', '3mf', 'scad')
     * @param {Object} options - Export options
     */
    async handleExport(type, options = {}) {
        if (!this.lastResult) {
            this.uiManager.showError('No image processed yet');
            return;
        }

        const settings = this.settingsManager.getSettings();

        try {
            switch (type) {
                case 'pdf':
                    return await this.exportPDF();
                case '3mf':
                    return await this.export3MF(options);
                case 'scad':
                    return await this.exportSCAD();
                default:
                    throw new Error(`Unknown export type: ${type}`);
            }
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            this.uiManager.showError(`Error generating ${type.toUpperCase()}`);
            throw error;
        }
    }

    /**
     * Export as PDF
     */
    async exportPDF() {
        const blob = await this.pdfExporter.exportProject(
            this.uiManager.elements.diceCanvas,
            this.uiManager.elements.originalCanvas,
            {
                gridWidth: this.lastResult.gridWidth,
                gridHeight: this.lastResult.gridHeight,
                totalDice: this.lastResult.totalDice,
            }
        );

        this.exporter3mf.saveFile(blob, 'dice-art-project.pdf');
        return blob;
    }

    /**
     * Export as 3MF
     */
    async export3MF(options = {}) {
        const settings = this.settingsManager.getSettings();
        const blob = await this.exporter3mf.generateSinglePlate3MF(
            this.lastResult.diceLevels,
            this.lastResult.gridWidth,
            this.lastResult.gridHeight,
            settings.diceSize,
            options
        );

        this.exporter3mf.saveFile(blob, `dice-art-${settings.diceSize}mm.3mf`);
        return blob;
    }

    /**
     * Export as OpenSCAD
     */
    async exportSCAD() {
        const settings = this.settingsManager.getSettings();
        const scadCode = this.scadExporter.generateSCAD(
            this.lastResult.diceLevels,
            this.lastResult.gridWidth,
            this.lastResult.gridHeight,
            settings.diceSize
        );

        const blob = new Blob([scadCode], { type: 'text/plain' });
        this.exporter3mf.saveFile(blob, `dice-art-${settings.diceSize}mm.scad`);
        return blob;
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
