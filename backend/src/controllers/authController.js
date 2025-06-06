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
    // For simplicity, we'll use name as a key. In a real app, ensure uniqueness or use generated IDs.
    // Let's assume username should be unique for this example.
    // A better approach would be an email/password or a unique generated ID stored client-side.
    // Here, we'll create a user if not exists or return existing user data.

    // This is a simplified lookup; for actual unique username check, a GSI on 'name' might be needed
    // or ensure 'id' is generated and name is an attribute. For now, we use a simple generated ID.

    const userId = uuidv4(); // Generate a unique ID for every user for now.
                            // Or, try to fetch by name first.

    const userItem = {
      userID: userId, // Primary Key
      username: sanitizedName,
      lastSeen: new Date().toISOString(),
      status: 'offline', // Will be updated to 'online' via socket connection
      // Add other user details as needed (wins, losses, etc.)
      wins: 0,
      losses: 0,
      draws: 0,
    };

    const putParams = {
      TableName: config.aws.usersTable,
      Item: userItem,
      // ConditionExpression: "attribute_not_exists(id)" // To prevent overwriting if ID must be unique from elsewhere
    };

    await docClient.send(new PutCommand(putParams));
    // In a real scenario, you'd check if user with 'sanitizedName' already exists
    // and decide whether to update or return existing.
    // For this example, we're creating/overwriting with a new ID each time
    // which is not ideal for actual login, but suffices for "enter name".

    res.status(201).json({
       message: 'User registered/updated successfully',
       user: { id: userItem.userID, username: userItem.username },
     });

  } catch (error) {
    console.error('Error in registerOrLoginUser:', error);
    res.status(500).json({ message: 'Error processing user registration', error: error.message });
  }
};