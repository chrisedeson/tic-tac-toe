// backend/src/services/userService.js
const { getDB } = require('../config/db');

exports.updateUserStats = async (userId, result) => {
  if (userId === 'christopher' || !userId) return null;

  const key = result === 'wins' ? 'wins' : result === 'losses' ? 'losses' : 'draws';

  try {
    const updated = await getDB()
      .collection('users')
      .findOneAndUpdate(
        { _id: userId },
        { $inc: { [key]: 1 } },
        { returnDocument: 'after' }
      );
    return updated;
  } catch (error) {
    console.error(`Failed to update stats for user ${userId}:`, error);
    return null;
  }
};

exports.getUserProfile = async (userId) => {
  try {
    const user = await getDB().collection('users').findOne({ _id: userId });
    return user;
  } catch (error) {
    console.error(`Failed to get user profile for ${userId}:`, error);
    return null;
  }
};
