/**
 * Generates a random hexadecimal session ID of specified length
 * @param {number} length - The length of the session ID to generate
 * @returns {string} - A random hexadecimal string
 */
const generateSessionId = (length = 16) => {
    const characters = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

module.exports = { generateSessionId };