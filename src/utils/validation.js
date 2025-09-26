const mongoose = require('mongoose');

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId format
 */
function validateObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Safely converts a string to ObjectId if valid
 * @param {string} id - The ID to convert
 * @returns {mongoose.Types.ObjectId|null} - ObjectId if valid, null otherwise
 */
function toObjectId(id) {
  if (!validateObjectId(id)) {
    return null;
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Creates a safe query value for IDs (handles both ObjectId and string IDs)
 * @param {string} id - The ID to process
 * @returns {mongoose.Types.ObjectId|string} - ObjectId if valid format, original string otherwise
 */
function safeIdQuery(id) {
  if (!id) return null;
  
  if (validateObjectId(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  
  // For demo/testing purposes with simple IDs like "1", "2", etc.
  // We'll return a special demo ObjectId or handle differently
  return id;
}

/**
 * Validates and converts array of IDs to ObjectIds
 * @param {string[]|mongoose.Types.ObjectId[]} ids - Array of IDs to validate
 * @returns {mongoose.Types.ObjectId[]} - Array of valid ObjectIds
 */
function validateObjectIdArray(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }
  
  return ids
    .map(id => toObjectId(id))
    .filter(id => id !== null);
}

/**
 * Sanitizes query parameters to prevent NoSQL injection
 * @param {any} query - Query object to sanitize
 * @returns {any} - Sanitized query object
 */
function sanitizeQuery(query) {
  if (query === null || query === undefined) {
    return query;
  }
  
  if (typeof query === 'object' && !Array.isArray(query) && !(query instanceof Date)) {
    // Remove dangerous operators
    const dangerousOperators = ['$where', '$regex', '$ne', '$nin', '$or', '$nor', '$and'];
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      if (!dangerousOperators.includes(key)) {
        sanitized[key] = sanitizeQuery(value);
      }
    }
    
    return sanitized;
  }
  
  return query;
}

module.exports = {
  validateObjectId,
  toObjectId,
  safeIdQuery,
  validateObjectIdArray,
  sanitizeQuery
};