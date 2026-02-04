/**
 * 3MF Exporter Strategy
 * Exports dice art as 3MF files for 3D printing
 */

import ExporterStrategy from './ExporterStrategy.js';
import Exporter3MF from '../exporter3mf.js';

export default class ThreeMFExporterStrategy extends ExporterStrategy {
    constructor() {
        super();
        this.exporter = new Exporter3MF();
    }

    /**
     * Export dice art as 3MF file
     * @param {Object} data - Export data
     * @param {Object} options - 3MF-specific options
     * @param {number} options.diceSize - Dice size in mm (5, 10, or 15)
     * @param {boolean} options.primeTower - Enable prime tower
     * @param {boolean} options.raft - Enable raft base
     * @param {boolean} options.spacing - Add spacing between dice
     * @param {boolean} options.multiPlate - Generate multi-plate export
     * @returns {Promise<Blob>} 3MF file blob
     */
    async export(data, options = {}) {
        this.validateData(data);

        const exportOptions = {
            primeTower: options.primeTower !== undefined ? options.primeTower : false,
            raft: options.raft !== undefined ? options.raft : true,
            spacing: options.spacing !== undefined ? options.spacing : true,
        };

        const diceSize = options.diceSize || 10;

        if (options.multiPlate) {
            return await this.exporter.generateMultiPlate3MF(
                data.diceLevels,
                data.gridWidth,
                data.gridHeight,
                diceSize,
                exportOptions
            );
        } else {
            return await this.exporter.generateSinglePlate3MF(
                data.diceLevels,
                data.gridWidth,
                data.gridHeight,
                diceSize,
                exportOptions
            );
        }
    }

    getExtension() {
        return '3mf';
    }

    getMimeType() {
        return 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml';
    }

    getFormatName() {
        return '3MF 3D Model';
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
