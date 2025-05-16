// Utility functions for generating random IDs and other values

/**
 * Generates a random session ID (6 characters, uppercase alphanumeric)
 * @returns {string} - A random 6-character session ID
 */
function generateSessionId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like 0, O, 1, I
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = {
    generateSessionId
};