// backend/src/controllers/userController.js
const { ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/db');
const config = require('../config');

const getAllUsers = async (req, res) => {
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


// ✅ New controller
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const command = new GetCommand({
      TableName: config.aws.usersTable,
      Key: { userID: id },
    });

    const { Item } = await docClient.send(command);

    if (!Item) {
  return res.status(404).json({ message: 'User not found' });
}
res.status(200).json({ user: Item }); // <--- important
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById, // export new controller
};
