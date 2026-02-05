/**
 * Input Validation Utilities
 * Sanitizes and validates user inputs for security and data integrity
 */

import {
    MAX_FILE_SIZE,
    SUPPORTED_FORMATS,
    MIN_GRID_SIZE,
    MAX_GRID_SIZE,
    DEFAULT_DIE_COLOR,
    DEFAULT_POINT_COLOR,
    DICE_SIZE_OPTIONS
} from '../constants.js';

/**
 * Validates and sanitizes a hex color string
 * @param {string} color - Hex color (e.g., "#FF0000")
 * @param {string} fallback - Fallback color if validation fails
 * @returns {string} Valid hex color
 */
export function sanitizeHexColor(color, fallback = '#000000') {
    if (typeof color !== 'string') return fallback;
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    return hexPattern.test(color) ? color : fallback;
}

/**
 * Validates file type and size
 * @param {File} file - File to validate
 * @throws {Error} If file is invalid
 * @returns {boolean} True if valid
 */
export function validateFile(file) {
    if (!file) {
        throw new Error('No file provided');
    }

    // Check file type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
        throw new Error(`Unsupported file format. Please use: ${SUPPORTED_FORMATS.join(', ')}`);
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
        throw new Error(`File too large. Maximum size: ${maxSizeMB}MB`);
    }

    return true;
}

/**
 * Clamps a number to a specified range
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Validates and sanitizes grid size
 * @param {number} size - Grid size
 * @returns {number} Valid grid size
 */
export function sanitizeGridSize(size) {
    const numSize = parseInt(size, 10);
    if (isNaN(numSize)) return MIN_GRID_SIZE;
    return clamp(numSize, MIN_GRID_SIZE, MAX_GRID_SIZE);
}

/**
 * Validates and sanitizes brightness/contrast values
 * @param {number} value - Adjustment value
 * @returns {number} Valid value between -100 and 100
 */
export function sanitizeAdjustment(value) {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return 0;
    return clamp(numValue, -100, 100);
}

/**
 * Validates dice size option
 * @param {number} size - Dice size in mm
 * @returns {number} Valid dice size
 */
export function sanitizeDiceSize(size) {
    const numSize = parseInt(size, 10);
    if (isNaN(numSize) || !DICE_SIZE_OPTIONS.includes(numSize)) {
        return DICE_SIZE_OPTIONS[1]; // Default to 10mm
    }
    return numSize;
}

/**
 * Validates settings object before saving
 * @param {Object} settings - Settings to validate
 * @returns {Object} Sanitized settings
 */
export function sanitizeSettings(settings) {
    return {
        gridSize: sanitizeGridSize(settings.gridSize),
        brightness: sanitizeAdjustment(settings.brightness),
        contrast: sanitizeAdjustment(settings.contrast),
        dieColor: sanitizeHexColor(settings.dieColor, DEFAULT_DIE_COLOR),
        pointColor: sanitizeHexColor(settings.pointColor, DEFAULT_POINT_COLOR),
        sourceGrayscale: Boolean(settings.sourceGrayscale),
        diceSize: sanitizeDiceSize(settings.diceSize),
        invertOrder: Boolean(settings.invertOrder),
        invertColor: Boolean(settings.invertColor),
    };
}
