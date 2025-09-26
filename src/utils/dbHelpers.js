const { Cooperativa, User } = require('../models');
const { validateObjectId } = require('./validation');
const mongoose = require('mongoose');

/**
 * Ensure a cooperativa exists in the database, creating it if necessary
 * @param {String} cooperativaId - The cooperativa ID from external system
 * @param {String} cooperativaName - The cooperativa display name
 * @returns {Promise<Object>} The cooperativa document
 */
async function ensureCooperativaExists(cooperativaId, cooperativaName) {
  if (!cooperativaId) {
    throw new Error('cooperativaId is required');
  }

  // For demo/testing purposes with simple IDs like "1", return a mock cooperativa
  if (!validateObjectId(cooperativaId)) {
    return {
      _id: cooperativaId,
      name: cooperativaName || 'Cooperativa',
      description: `Cooperativa ${cooperativaName || 'sin nombre'}`,
      status: 'pre-obra',
      totalMembers: 0,
      location: {
        city: '',
        department: ''
      }
    };
  }

  try {
    // Try to find existing cooperativa
    let cooperativa = await Cooperativa.findById(cooperativaId);
    
    if (!cooperativa) {
      // Create new cooperativa with the provided ID
      cooperativa = new Cooperativa({
        _id: cooperativaId,
        name: cooperativaName || 'Cooperativa',
        description: `Cooperativa ${cooperativaName || 'sin nombre'}`,
        status: 'pre-obra',
        totalMembers: 0,
        location: {
          city: '',
          department: ''
        }
      });
      
      await cooperativa.save();
      console.log(`Created new cooperativa: ${cooperativaName} (${cooperativaId})`);
    }
    
    return cooperativa;
  } catch (error) {
    console.error('Error ensuring cooperativa exists:', error);
    // If the error is due to invalid ObjectId format, create with generated ID
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      try {
        // Check if cooperativa exists by name
        let cooperativa = await Cooperativa.findOne({ name: cooperativaName });
        
        if (!cooperativa) {
          // Create new cooperativa without specifying _id (will auto-generate)
          cooperativa = new Cooperativa({
            name: cooperativaName || 'Cooperativa',
            description: `Cooperativa ${cooperativaName || 'sin nombre'}`,
            status: 'pre-obra',
            totalMembers: 0,
            location: {
              city: '',
              department: ''
            }
          });
          
          await cooperativa.save();
          console.log(`Created new cooperativa with auto-generated ID: ${cooperativaName} (${cooperativa._id})`);
        }
        
        return cooperativa;
      } catch (innerError) {
        throw innerError;
      }
    }
    throw error;
  }
}

/**
 * Ensure a user exists in the database, creating it if necessary
 * @param {String} userId - The user ID from external system
 * @param {String} userName - The user display name
 * @param {String} cooperativaId - The cooperativa ID the user belongs to
 * @param {String} userRole - The user role (default: 'user')
 * @returns {Promise<Object>} The user document
 */
async function ensureUserExists(userId, userName, cooperativaId, userRole = 'user') {
  if (!userId) {
    throw new Error('userId is required');
  }

  // For demo/testing purposes with simple IDs like "1", return a mock user
  if (!validateObjectId(userId)) {
    const nameParts = (userName || 'Usuario').split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return {
      _id: userId,
      username: `${firstName.toLowerCase()}${lastName ? lastName[0].toLowerCase() : ''}`,
      firstName,
      lastName,
      role: userRole,
      cooperativaId: cooperativaId,
      status: 'active',
      memberType: 'socio'
    };
  }

  try {
    // Try to find existing user
    let user = await User.findById(userId);
    
    if (!user) {
      // Parse name into first and last name
      const nameParts = (userName || 'Usuario').split(' ');
      const firstName = nameParts[0] || 'Usuario';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Generate a unique username from the name and ID
      const baseUsername = `${firstName.toLowerCase()}${lastName ? lastName[0].toLowerCase() : ''}`;
      let username = baseUsername;
      let counter = 1;
      
      // Check for username uniqueness
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }
      
      // Create new user with the provided ID
      user = new User({
        _id: userId,
        username,
        firstName,
        lastName,
        role: userRole,
        cooperativaId: validateObjectId(cooperativaId) ? cooperativaId : null,
        status: 'active',
        memberType: 'socio'
      });
      
      await user.save();
      console.log(`Created new user: ${userName} (${userId})`);
      
      // Update cooperativa member count
      if (validateObjectId(cooperativaId)) {
        await Cooperativa.findByIdAndUpdate(
          cooperativaId,
          { $inc: { totalMembers: 1 } }
        );
      }
    } else {
      // Update user's cooperativa if it has changed
      if (validateObjectId(cooperativaId) && user.cooperativaId?.toString() !== cooperativaId) {
        user.cooperativaId = cooperativaId;
        await user.save();
        console.log(`Updated user cooperativa: ${userName} (${userId})`);
      }
    }
    
    return user;
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    // If the error is due to invalid ObjectId format, create with generated ID
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      try {
        // Parse name into first and last name
        const nameParts = (userName || 'Usuario').split(' ');
        const firstName = nameParts[0] || 'Usuario';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Generate a unique username
        const baseUsername = `${firstName.toLowerCase()}${lastName ? lastName[0].toLowerCase() : ''}`;
        let username = baseUsername;
        let counter = 1;
        
        // Check for username uniqueness
        while (await User.findOne({ username })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }
        
        // Check if user exists by username
        let user = await User.findOne({ username });
        
        if (!user) {
          // Create new user without specifying _id (will auto-generate)
          user = new User({
            username,
            firstName,
            lastName,
            role: userRole,
            cooperativaId: validateObjectId(cooperativaId) ? cooperativaId : null,
            status: 'active',
            memberType: 'socio'
          });
          
          await user.save();
          console.log(`Created new user with auto-generated ID: ${userName} (${user._id})`);
          
          // Update cooperativa member count
          if (validateObjectId(cooperativaId)) {
            await Cooperativa.findByIdAndUpdate(
              cooperativaId,
              { $inc: { totalMembers: 1 } }
            );
          }
        }
        
        return user;
      } catch (innerError) {
        throw innerError;
      }
    }
    throw error;
  }
}

module.exports = {
  ensureCooperativaExists,
  ensureUserExists
};