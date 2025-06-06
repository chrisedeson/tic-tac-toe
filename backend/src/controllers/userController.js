// backend/src/controllers/userController.js
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/db');
const config = require('../config');

exports.getAllUsers = async (req, res) => {
  try {
    const params = {
      TableName: config.aws.usersTable,
      ProjectionExpression: "userID, username, lastSeen, #status",
      ExpressionAttributeNames: { "#status": "status" },
    };

    const { Items } = await docClient.send(new ScanCommand(params));
    const formatted = (Items || []).map(item => ({
      userId: item.userID,
      username: item.username,
      lastSeen: item.lastSeen,
      status: item.status,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};
