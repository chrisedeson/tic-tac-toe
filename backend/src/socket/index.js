const { initChatHandler } = require('./handlers/chatHandler');
const { initGameHandler } = require('./handlers/gameHandler');
const { initUserHandler } = require('./handlers/userHandler');
const { EVENTS } = require('./events');
const { docClient } = require('../config/db');
const config = require('../config');
const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const onlineUsers = new Map();

// Helper to update user status in DynamoDB
const setUserOnlineStatus = async (userId, status, lastSeen = null) => {
  const params = {
    TableName: config.aws.usersTable,
    Key: { userID: userId },
    UpdateExpression: 'set #status = :status' + (lastSeen ? ', lastSeen = :lastSeen' : ''),
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
    },
  };
  if (lastSeen) {
    params.ExpressionAttributeValues[':lastSeen'] = lastSeen;
  }
  try {
    await docClient.send(new UpdateCommand(params));
    console.log(`User ${userId} status updated to ${status}`);
  } catch (error) {
    console.error(`Error updating user ${userId} status:`, error);
  }
};

module.exports = (io) => {
  io.on(EVENTS.CONNECTION, (socket) => {
    console.log(`User connected: ${socket.id}`);

    initUserHandler(io, socket, onlineUsers);
    initChatHandler(io, socket, onlineUsers);
    initGameHandler(io, socket, onlineUsers);

    socket.on(EVENTS.DISCONNECT, async (reason) => {
      console.log(`User disconnected: ${socket.id}, reason: ${reason}`);

      const userData = onlineUsers.get(socket.id);
      if (userData) {
        onlineUsers.delete(socket.id);

        try {
          await setUserOnlineStatus(userData.userId, 'offline', new Date().toISOString());
        } catch (error) {
          console.error(`Failed to update user status on disconnect:`, error);
        }

        io.emit(EVENTS.USER_OFFLINE, {
          userId: userData.userId,
          username: userData.username,
        });

        io.emit(EVENTS.USER_LIST_UPDATED, Array.from(onlineUsers.values()).map(u => ({
          userId: u.userId,
          username: u.username,
          lastSeen: 'Online',
        })));

        console.log('Updated online users:', Array.from(onlineUsers.values()));
      }
    });
  });
};
