/**
 * OpenSCAD Exporter Strategy
 * Exports dice art as OpenSCAD script files
 */

import ExporterStrategy from './ExporterStrategy.js';
import ExporterSCAD from '../scadExporter.js';

export default class SCADExporterStrategy extends ExporterStrategy {
    constructor() {
        super();
        this.exporter = new ExporterSCAD();
    }

    /**
     * Export dice art as OpenSCAD script
     * @param {Object} data - Export data
     * @param {Object} options - SCAD-specific options
     * @param {number} options.diceSize - Dice size in mm
     * @returns {Promise<Blob>} SCAD file blob
     */
    async export(data, options = {}) {
        this.validateData(data);

        const diceSize = options.diceSize || 10;

        const scadCode = this.exporter.generateSCAD(
            data.diceLevels,
            data.gridWidth,
            data.gridHeight,
            diceSize
        );

        return new Blob([scadCode], { type: this.getMimeType() });
    }

    getExtension() {
        return 'scad';
    }

    getMimeType() {
        return 'text/plain';
    }

    getFormatName() {
        return 'OpenSCAD Script';
    }

    /**
     * Generate filename with dice size
     */
    generateFilename(options = {}) {
        const diceSize = options.diceSize || 10;
        const timestamp = new Date().toISOString().split('T')[0];
        const base = options.filename || `dice-art-${diceSize}mm-${timestamp}`;
        return `${base}.${this.getExtension()}`;
    }
}
