// backend/src/controllers/authController.js
const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.registerOrLoginUser = async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Name is required' });
  }

  const sanitizedName = name.trim();

  try {
    const userId = uuidv4();

    const userItem = {
      _id: userId,
      userID: userId,
      username: sanitizedName,
      lastSeen: new Date().toISOString(),
      status: 'offline',
      gameStatus: 'offline',
      wins: 0,
      losses: 0,
      draws: 0,
    };

    await getDB().collection('users').insertOne(userItem);

    res.status(201).json({
      message: 'User registered/updated successfully',
      user: {
        userID: userItem.userID,
        username: userItem.username,
        wins: userItem.wins,
        losses: userItem.losses,
        draws: userItem.draws,
        gameStatus: userItem.gameStatus,
      },
    });
  } catch (error) {
    console.error('Error in registerOrLoginUser:', error);
    res
      .status(500)
      .json({ message: 'Error processing user registration', error: error.message });
  }
};
