const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();

// Import your centralized config
const config = require('../config');

// Set the AWS region using the centralized config
AWS.config.update({
  region: config.aws.region,  // Use the region from config
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

// Setup DynamoDB (assuming you're using the DocumentClient)
const docClient = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = config.aws.usersTable;  // Use the table name from config

// Fetch user stats endpoint
router.get('/user/:userId/stats', async (req, res) => {
  const { userId } = req.params; // Extract userId from the route params

  try {
    // Query DynamoDB to get user stats using 'userID' (matching your AWS attribute)
    const params = {
      TableName: USERS_TABLE,
      Key: { userID: userId },  // Change 'userId' to 'userID' as per your DynamoDB schema
    };

    const result = await docClient.get(params).promise();

    if (!result.Item) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return stats (assuming the stats are stored in the user record)
    const { wins, losses, draws } = result.Item;
    return res.json({ wins, losses, draws });
  } catch (error) {
    console.error("Error fetching user stats:", error);  // Log the full error object

    // Return a more detailed error response
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
