// backend/src/controllers/authController.js
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/db');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

exports.registerOrLoginUser = async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ message: 'Name is required' });
  }

  const sanitizedName = name.trim();

  try {
    // This logic creates a new user on every login.
    // For a real application, you would first search for an existing user by name or another unique identifier.
    const userId = uuidv4();

    const userItem = {
      userID: userId,
      username: sanitizedName,
      lastSeen: new Date().toISOString(),
      status: 'offline',
      gameStatus: 'offline',  // <-- Adding 'gameStatus' here
      wins: 0,
      losses: 0,
      draws: 0,
    };

    const putParams = {
      TableName: config.aws.usersTable,
      Item: userItem,
    };

    await docClient.send(new PutCommand(putParams));

    res.status(201).json({
      message: 'User registered/updated successfully',
      user: {
        userID: userItem.userID,
        username: userItem.username,
        wins: userItem.wins,
        losses: userItem.losses,
        draws: userItem.draws,
        gameStatus: userItem.gameStatus,  // <-- Make sure to return gameStatus
      },
    });
  } catch (error) {
    console.error('Error in registerOrLoginUser:', error);
    res.status(500).json({ message: 'Error processing user registration', error: error.message });
  }
};
