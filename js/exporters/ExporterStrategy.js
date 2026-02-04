/**
 * Base Exporter Strategy
 * Abstract base class defining the interface for all export formats
 */

export default class ExporterStrategy {
    /**
     * Export data to the target format
     * @param {Object} data - Export data
     * @param {Uint8Array} data.diceLevels - Dice level array
     * @param {number} data.gridWidth - Grid width
     * @param {number} data.gridHeight - Grid height
     * @param {HTMLCanvasElement} data.diceCanvas - Rendered dice canvas
     * @param {HTMLCanvasElement} data.originalCanvas - Original image canvas
     * @param {Object} options - Format-specific export options
     * @returns {Promise<Blob>} Exported file as blob
     * @throws {Error} If not implemented by subclass
     */
    async export(data, options = {}) {
        throw new Error('export() must be implemented by subclass');
    }

    /**
     * Get the default file extension for this format
     * @returns {string} File extension (e.g., 'pdf', '3mf', 'scad')
     */
    getExtension() {
        throw new Error('getExtension() must be implemented by subclass');
    }

    /**
     * Get the MIME type for this format
     * @returns {string} MIME type
     */
    getMimeType() {
        throw new Error('getMimeType() must be implemented by subclass');
    }

    /**
     * Get human-readable format name
     * @returns {string} Format name
     */
    getFormatName() {
        throw new Error('getFormatName() must be implemented by subclass');
    }

    /**
     * Validate export data before processing
     * @param {Object} data - Export data to validate
     * @throws {Error} If data is invalid
     */
    validateData(data) {
        if (!data) {
            throw new Error('Export data is required');
        }
        if (!data.diceLevels || !data.gridWidth || !data.gridHeight) {
            throw new Error('Missing required export data (diceLevels, gridWidth, gridHeight)');
        }
    }

    /**
     * Generate filename for export
     * @param {Object} options - Export options that may include filename hints
     * @returns {string} Generated filename
     */
    generateFilename(options = {}) {
        const timestamp = new Date().toISOString().split('T')[0];
        const base = options.filename || `dice-art-${timestamp}`;
        return `${base}.${this.getExtension()}`;
    }

    /**
     * Save blob to file (triggers download)
     * @param {Blob} blob - File blob
     * @param {string} filename - Filename for download
     */
    saveFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
