const { validateObjectId } = require('./validation');
const mongoose = require('mongoose');

/**
 * Safely converts cooperativaId to ObjectId for MongoDB queries
 * Returns null if not valid ObjectId (for demo mode)
 * @param {string} cooperativaId - The cooperativa ID from query params
 * @returns {mongoose.Types.ObjectId|null}
 */
function safeCooperativaId(cooperativaId) {
  if (!cooperativaId) return null;
  
  if (validateObjectId(cooperativaId)) {
    return new mongoose.Types.ObjectId(cooperativaId);
  }
  
  // For demo/testing purposes with simple IDs like "1", return null
  // This will cause queries to return empty results gracefully
  return null;
}

/**
 * Safely converts userId to ObjectId for MongoDB queries
 * Returns null if not valid ObjectId (for demo mode)
 * @param {string} userId - The user ID from query params
 * @returns {mongoose.Types.ObjectId|null}
 */
function safeUserId(userId) {
  if (!userId) return null;
  
  if (validateObjectId(userId)) {
    return new mongoose.Types.ObjectId(userId);
  }
  
  // For demo/testing purposes with simple IDs like "1", return null
  return null;
}

/**
 * Creates a safe query object that won't crash on invalid ObjectIds
 * @param {Object} baseQuery - Base query object
 * @param {string} cooperativaId - Cooperativa ID
 * @returns {Object|null} - Safe query object or null if invalid IDs
 */
function createSafeQuery(baseQuery, cooperativaId) {
  const safeCoopId = safeCooperativaId(cooperativaId);
  
  if (!safeCoopId) {
    // Return null to indicate we should return empty results
    return null;
  }
  
  return {
    ...baseQuery,
    cooperativaId: safeCoopId
  };
}

module.exports = {
  safeCooperativaId,
  safeUserId,
  createSafeQuery
};