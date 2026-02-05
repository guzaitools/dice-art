/**
 * Exporter Factory
 * Central registry for all export formats
 */

import PDFExporterStrategy from './PDFExporterStrategy.js';
import ThreeMFExporterStrategy from './ThreeMFExporterStrategy.js';

export default class ExporterFactory {
    constructor() {
        this.exporters = new Map();
        this.registerDefaultExporters();
    }

    /**
     * Register default exporters
     */
    registerDefaultExporters() {
        this.register('pdf', new PDFExporterStrategy());
        this.register('3mf', new ThreeMFExporterStrategy());
    }

    /**
     * Register a new exporter
     * @param {string} format - Format identifier (e.g., 'pdf', '3mf')
     * @param {ExporterStrategy} exporter - Exporter instance
     */
    register(format, exporter) {
        this.exporters.set(format.toLowerCase(), exporter);
    }

    /**
     * Get an exporter for a specific format
     * @param {string} format - Format identifier
     * @returns {ExporterStrategy} Exporter instance
     * @throws {Error} If format is not registered
     */
    get(format) {
        const exporter = this.exporters.get(format.toLowerCase());
        if (!exporter) {
            throw new Error(`No exporter registered for format: ${format}`);
        }
        return exporter;
    }

    /**
     * Check if a format is supported
     * @param {string} format - Format to check
     * @returns {boolean} True if supported
     */
    supports(format) {
        return this.exporters.has(format.toLowerCase());
    }

    /**
     * Get list of all supported formats
     * @returns {Array<string>} Array of format identifiers
     */
    getSupportedFormats() {
        return Array.from(this.exporters.keys());
    }

    /**
     * Export data to a specific format
     * @param {string} format - Format identifier
     * @param {Object} data - Export data
     * @param {Object} options - Format-specific options
     * @returns {Promise<Blob>} Exported file blob
     */
    async export(format, data, options = {}) {
        const exporter = this.get(format);
        const blob = await exporter.export(data, options);
        const filename = exporter.generateFilename(options);

        if (options.autoSave !== false) {
            exporter.saveFile(blob, filename);
        }

        return blob;
    }

    /**
     * Get format information
     * @param {string} format - Format identifier
     * @returns {Object} Format info
     */
    getFormatInfo(format) {
        const exporter = this.get(format);
        return {
            format: format,
            extension: exporter.getExtension(),
            mimeType: exporter.getMimeType(),
            name: exporter.getFormatName(),
        };
    }
}
