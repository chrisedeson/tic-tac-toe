// backend/src/controllers/userController.js
const {
  ScanCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const config = require("../config");

// Function to get all users
const getAllUsers = async (req, res) => {
  try {
    const params = {
      TableName: config.aws.usersTable,
      ProjectionExpression: "userID, username, lastSeen, #status, gameStatus",
      ExpressionAttributeNames: { "#status": "status" },
    };

    const { Items } = await docClient.send(new ScanCommand(params));
    const formatted = (Items || []).map((item) => ({
      userId: item.userID,
      username: item.username,
      lastSeen: item.lastSeen,
      status: item.status,
      gameStatus: item.gameStatus,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching all users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Function to update game status
const updateGameStatus = async (userId, status) => {
  if (!userId || !status) {
    console.error("Missing userId or status");
    return null;
  }

  const params = {
    TableName: config.aws.usersTable,
    Key: { userID: userId },
    UpdateExpression: "SET gameStatus = :status",
    ExpressionAttributeValues: { ":status": status },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    return Attributes;
  } catch (error) {
    console.error(`Failed to update game status for user ${userId}:`, error);
    return null;
  }
};

// Start game route
const startGame = async (req, res) => {
  const { userId } = req.params;

  try {
    const updatedUser = await updateGameStatus(userId, "playing");
    if (updatedUser) {
      return res
        .status(200)
        .json({ message: "Game started", user: updatedUser });
    }
    return res.status(500).json({ message: "Failed to start the game" });
  } catch (error) {
    console.error("Error starting game:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// End game route
const endGame = async (req, res) => {
  const { userId } = req.params;

  try {
    const updatedUser = await updateGameStatus(userId, "offline");
    if (updatedUser) {
      return res.status(200).json({ message: "Game ended", user: updatedUser });
    }
    return res.status(500).json({ message: "Failed to end the game" });
  } catch (error) {
    console.error("Error ending game:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Get user by ID route
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const command = new GetCommand({
      TableName: config.aws.usersTable,
      Key: { userID: id },
    });

    const { Item } = await docClient.send(command);

    if (!Item) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user: Item });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update user presence (status and lastSeen)
const updatePresence = async (req, res) => {
  const { userId } = req.params;
  const { status, lastSeen } = req.body;

  if (!userId || !status) {
    return res.status(400).json({ message: "userId and status are required" });
  }

  const updateExpr = ['#st = :status'];
  const exprNames = { '#st': 'status' };
  const exprValues = { ':status': status };

  if (lastSeen) {
    updateExpr.push('lastSeen = :lastSeen');
    exprValues[':lastSeen'] = lastSeen;
  }

  try {
    const params = {
      TableName: config.aws.usersTable,
      Key: { userID: userId },
      UpdateExpression: 'SET ' + updateExpr.join(', '),
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: 'UPDATED_NEW',
    };

    const { Attributes } = await docClient.send(new UpdateCommand(params));
    return res.status(200).json({ message: 'Presence updated', attributes: Attributes });
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
