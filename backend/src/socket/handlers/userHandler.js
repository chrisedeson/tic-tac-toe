// backend/src/socket/handlers/userHandler.js
const { EVENTS } = require('../events');
const { docClient } = require('../../config/db');
const config = require('../../config');
const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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


module.exports.initUserHandler = (io, socket, onlineUsers) => {
  socket.on(EVENTS.USER_ONLINE, async ({ userId, username }) => {
    if (!userId || !username) {
      // Could emit an error back to the client
      console.error('User ID and username are required for USER_ONLINE event');
      return;
    }
    console.log(`User ${username} (${userId}) attempting to go online with socket ${socket.id}`);
    onlineUsers.set(socket.id, { userId, username, socketId: socket.id });

    // Update user status in DB
    await setUserOnlineStatus(userId, 'online');

    // Store userId on socket object for easier access
    socket.data.userId = userId;
    socket.data.username = username;

    io.emit(EVENTS.USER_LIST_UPDATED, Array.from(onlineUsers.values()).map(u => ({ userId: u.userId, username: u.username, lastSeen: 'Online' }))); // Add lastSeen formatting
    console.log('Updated online users:', Array.from(onlineUsers.values()));

    // Join a room specific to this user for private messages/notifications
    socket.join(userId);
  });

  socket.on(EVENTS.GET_USER_LIST, () => {
    // This needs to fetch from DB and merge with socket onlineUsers for "last seen"
    // For now, just send current socket-tracked users
    socket.emit(EVENTS.USER_LIST_UPDATED, Array.from(onlineUsers.values()).map(u => ({ userId: u.userId, username: u.username, lastSeen: 'Online' })));
  });

  // Handle disconnect in main socket index.js to also update DB
  socket.on(EVENTS.DISCONNECT, async () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      onlineUsers.delete(socket.id);
      await setUserOnlineStatus(userData.userId, 'offline', new Date().toISOString());
      io.emit(EVENTS.USER_OFFLINE, { userId: userData.userId, username: userData.username });
      io.emit(EVENTS.USER_LIST_UPDATED, Array.from(onlineUsers.values()).map(u => ({ userId: u.userId, username: u.username, lastSeen: 'Online' }))); // Or fetch fresh from DB
      console.log(`User ${userData.username} went offline. Updated online users:`, Array.from(onlineUsers.values()));
    }
  });
};