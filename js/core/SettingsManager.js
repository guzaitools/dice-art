/**
 * Settings Manager
 * Handles application settings persistence and validation
 */

import { SETTINGS_STORAGE_KEY } from '../constants.js';
import { sanitizeSettings } from '../utils/validators.js';

export default class SettingsManager {
    /**
     * Creates a new SettingsManager instance
     * @param {Object} defaults - Default settings object
     */
    constructor(defaults = {}) {
        this.defaults = defaults;
        this.currentSettings = { ...defaults };
    }

    /**
     * Load settings from localStorage
     * @returns {Object} Loaded and sanitized settings
     */
    loadSettings() {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const sanitized = sanitizeSettings({ ...this.defaults, ...parsed });
                this.currentSettings = sanitized;
                return sanitized;
            } catch (e) {
                console.error('Error loading settings:', e);
                return { ...this.defaults };
            }
        }
        return { ...this.defaults };
    }

    /**
     * Save current settings to localStorage
     * @param {Object} settings - Settings to save (optional, uses current if not provided)
     */
    saveSettings(settings = null) {
        const toSave = settings || this.currentSettings;
        const sanitized = sanitizeSettings(toSave);
        this.currentSettings = sanitized;
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    }

    /**
     * Get current settings
     * @returns {Object} Current settings object
     */
    getSettings() {
        return { ...this.currentSettings };
    }

    /**
     * Get a specific setting value
     * @param {string} key - Setting key
     * @returns {*} Setting value
     */
    getSetting(key) {
        return this.currentSettings[key];
    }

    /**
     * Update a single setting
     * @param {string} key - Setting key
     * @param {*} value - New value
     */
    updateSetting(key, value) {
        this.currentSettings[key] = value;
        this.saveSettings();
    }

    /**
     * Update multiple settings at once
     * @param {Object} updates - Object with key-value pairs to update
     */
    updateSettings(updates) {
        this.currentSettings = { ...this.currentSettings, ...updates };
        this.saveSettings();
    }

    /**
     * Reset settings to defaults
     * @returns {Object} Default settings
     */
    resetToDefaults() {
        this.currentSettings = { ...this.defaults };
        this.saveSettings();
        return this.getSettings();
    }

    /**
     * Check if a setting has changed from defaults
     * @param {string} key - Setting key
     * @returns {boolean} True if setting differs from default
     */
    isModified(key) {
        return this.currentSettings[key] !== this.defaults[key];
    }

    /**
     * Get all modified settings
     * @returns {Object} Object containing only modified settings
     */
    getModifiedSettings() {
        const modified = {};
        for (const key in this.currentSettings) {
            if (this.isModified(key)) {
                modified[key] = this.currentSettings[key];
            }
        }
        return modified;
    }
}
