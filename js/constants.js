/**
 * Application Constants
 * Centralized configuration values and magic numbers
 */

// Branding
export const APP_NAME = 'Dice Art Engine';
export const APP_VERSION = '1.2.0';

// File Upload
export const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Canvas & Rendering
export const MAX_CANVAS_SIZE = 1200;
export const MIN_DICE_SIZE = 8;
export const MAX_DICE_SIZE = 50;
export const DICE_RENDER_CHUNK_SIZE = 500;
export const DICE_ANIMATION_DELAY = 0; // ms between chunks (ignored by rAF)

// Grid Settings
export const DEFAULT_GRID_SIZE = 50;
export const MIN_GRID_SIZE = 10;
export const MAX_GRID_SIZE = 200;

// UI Enhancement Defaults
export const DEFAULT_BRIGHTNESS = 0;
export const DEFAULT_CONTRAST = 0;

// Colors
export const DEFAULT_DIE_COLOR = '#000000';
export const DEFAULT_POINT_COLOR = '#ffffff';
export const GRID_LINE_COLOR = '#333333';

// 3MF Physical Parameters
export const DEFAULT_DICE_SIZE_MM = 10;
export const DICE_SIZE_OPTIONS = [5, 10, 15]; // in mm
export const DEFAULT_SPACING = 0.4; // mm between dice

// PDF Layout
export const PDF_PAGE_MARGIN = 15; // mm
export const PDF_LOGO_WIDTH_RATIO = 0.4;
export const PDF_LOGO_TOP_MARGIN = 15;
export const PDF_GRID_LINE_WIDTH = 0.2;
export const PDF_GRID_LINE_COLOR = { r: 255, g: 255, b: 255 };

// Settings Management
export const SETTINGS_STORAGE_KEY = 'diceArtSettings';
export const DEBOUNCE_DELAY = 300;

// Image Processor
export const MAX_CACHE_SIZE = 5;
export const GRAYSCALE_WEIGHTS = {
    RED: 0.299,
    GREEN: 0.587,
    BLUE: 0.114
};

// 3MF Template Paths
export const TEMPLATE_PATHS = ['/3mf-template/', 'public/3mf-template/'];

// Dice Level Mapping (grayscale to dice faces)
export const DICE_LEVEL_THRESHOLDS = [
    { min: 213, max: 255, level: 6 }, // Lightest
    { min: 170, max: 212, level: 5 },
    { min: 128, max: 169, level: 4 },
    { min: 85, max: 127, level: 3 },
    { min: 43, max: 84, level: 2 },
    { min: 0, max: 42, level: 1 },   // Darkest
];
