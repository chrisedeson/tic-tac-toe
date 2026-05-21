// backend/src/controllers/userController.js
const { getDB } = require('../config/db');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await getDB()
      .collection('users')
      .find(
        {},
        { projection: { userID: 1, username: 1, lastSeen: 1, status: 1, gameStatus: 1 } }
      )
      .toArray();

    const formatted = users.map((item) => ({
      userId: item.userID,
      username: item.username,
      lastSeen: item.lastSeen,
      status: item.status,
      gameStatus: item.gameStatus,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Update game status (returns the updated user document, or null)
const updateGameStatus = async (userId, status) => {
  if (!userId || !status) {
    console.error('Missing userId or status');
    return null;
  }

  try {
    const updated = await getDB()
      .collection('users')
      .findOneAndUpdate(
        { _id: userId },
        { $set: { gameStatus: status } },
        { returnDocument: 'after' }
      );
    return updated;
  } catch (error) {
    console.error(`Failed to update game status for user ${userId}:`, error);
    return null;
  }
};

// Start game route
const startGame = async (req, res) => {
  const { userId } = req.params;

  try {
    const updatedUser = await updateGameStatus(userId, 'playing');
    if (updatedUser) {
      return res.status(200).json({ message: 'Game started', user: updatedUser });
    }
    return res.status(500).json({ message: 'Failed to start the game' });
  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// End game route
const endGame = async (req, res) => {
  const { userId } = req.params;

  try {
    const updatedUser = await updateGameStatus(userId, 'offline');
    if (updatedUser) {
      return res.status(200).json({ message: 'Game ended', user: updatedUser });
    }
    return res.status(500).json({ message: 'Failed to end the game' });
  } catch (error) {
    console.error('Error ending game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user by ID route
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await getDB().collection('users').findOne({ _id: id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user presence (status and lastSeen)
const updatePresence = async (req, res) => {
  const { userId } = req.params;
  const { status, lastSeen } = req.body;

  if (!userId || !status) {
    return res.status(400).json({ message: 'userId and status are required' });
  }

  const setFields = { status };
  if (lastSeen) {
    setFields.lastSeen = lastSeen;
  }

  try {
    const updated = await getDB()
      .collection('users')
      .findOneAndUpdate(
        { _id: userId },
        { $set: setFields },
        { returnDocument: 'after' }
      );
    return res.status(200).json({ message: 'Presence updated', attributes: updated });
  } catch (err) {
    console.error('Error updating presence:', err);
    return res.status(500).json({ message: 'Failed to update presence' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  startGame,
  endGame,
  updateGameStatus,
  updatePresence,
};
