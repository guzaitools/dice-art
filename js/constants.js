/**
 * Application Constants
 * Centralized configuration values and magic numbers
 */

// File Upload
export const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Canvas & Rendering
export const MAX_CANVAS_SIZE = 1200;
export const MIN_DICE_SIZE = 8;
export const MAX_DICE_SIZE = 50;
export const DICE_RENDER_CHUNK_SIZE = 500;

// Grid
export const DEFAULT_GRID_SIZE = 50;
export const MIN_GRID_SIZE = 10;
export const MAX_GRID_SIZE = 200;

// Image Processing
export const GRAYSCALE_LUMINOSITY = {
    RED: 0.299,
    GREEN: 0.587,
    BLUE: 0.114,
};

// Dice Level Mapping (grayscale to dice faces)
export const DICE_LEVEL_THRESHOLDS = [
    { min: 213, max: 255, level: 6 }, // Lightest
    { min: 170, max: 212, level: 5 },
    { min: 128, max: 169, level: 4 },
    { min: 85, max: 127, level: 3 },
    { min: 43, max: 84, level: 2 },
    { min: 0, max: 42, level: 1 },   // Darkest
];

// 3MF Export
export const DEFAULT_DICE_SIZE_MM = 10;
export const DICE_SIZE_OPTIONS = [5, 10, 15]; // in mm
export const DEFAULT_SPACING = 0.4; // mm between dice

// PDF Export
export const PDF_PAGE_MARGIN = 15; // mm
export const PDF_LOGO_WIDTH_RATIO = 0.4; // 2/5 of page width
export const PDF_LOGO_TOP_MARGIN = 15; // mm from top
export const PDF_GRID_LINE_WIDTH = 0.2; // mm
export const PDF_GRID_LINE_COLOR = { r: 255, g: 255, b: 255 }; // white

// Colors
export const DEFAULT_DIE_COLOR = '#000000';
export const DEFAULT_POINT_COLOR = '#ffffff';
export const GRID_LINE_COLOR = '#333333';

// Settings
export const SETTINGS_STORAGE_KEY = 'diceArtSettings';

// UI
export const ANIMATION_DELAY = 0; // ms between chunks
export const DEBOUNCE_DELAY = 300; // ms for input debouncing

// 3MF Template Paths
export const TEMPLATE_PATHS = ['/3mf-template/', 'public/3mf-template/'];
