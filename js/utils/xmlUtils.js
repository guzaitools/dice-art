/**
 * XML Utilities
 * Helper functions for XML handling and sanitization
 */

/**
 * Escape characters for XML context
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
export function escapeXML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
