// backend/src/socket/handlers/userHandler.js
const { EVENTS } = require('../events');
const { docClient } = require('../../config/db');
const config = require('../../config');
const { UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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

// Fetch all users from DynamoDB
const getAllUsersFromDB = async () => {
  const params = {
    TableName: config.aws.usersTable,
  };
  try {
    const { Items } = await docClient.send(new ScanCommand(params));
    return Items || [];
  } catch (error) {
    console.error('Error fetching all users from DB:', error);
    return [];
  }
};

// Build combined user list merging DB users and online users
const buildUserList = (dbUsers, onlineUsers) => {
  // Map online users by userId for quick lookup
  const onlineMap = new Map();
  for (const user of onlineUsers.values()) {
    onlineMap.set(user.userId, user);
  }

  return dbUsers.map((dbUser) => {
    const onlineUser = onlineMap.get(dbUser.userID);
    return {
      userId: dbUser.userID,
      username: dbUser.username,
      lastSeen: onlineUser ? 'Online' : dbUser.lastSeen || 'Offline',
      status: onlineUser ? 'online' : dbUser.status || 'offline',
    };
  });
};

module.exports.initUserHandler = (io, socket, onlineUsers) => {
  socket.on(EVENTS.USER_ONLINE, async ({ userId, username }) => {
    if (!userId || !username) {
      console.error('User ID and username are required for USER_ONLINE event');
      return;
    }
    console.log(`User ${username} (${userId}) attempting to go online with socket ${socket.id}`);

    onlineUsers.set(socket.id, { userId, username, socketId: socket.id });

    // Update user status in DB (non-blocking)
    setUserOnlineStatus(userId, 'online').catch(console.error);

    socket.data.userId = userId;
    socket.data.username = username;

    // Fetch full user list with merged online status and lastSeen
    const dbUsers = await getAllUsersFromDB();
    const userList = buildUserList(dbUsers, onlineUsers);

    io.emit(EVENTS.USER_LIST_UPDATED, userList);

    console.log('Updated online users:', Array.from(onlineUsers.values()));

    socket.join(userId);
  });

  socket.on(EVENTS.GET_USER_LIST, async () => {
    // Fetch from DB and merge with online users for accurate info
    const dbUsers = await getAllUsersFromDB();
    const userList = buildUserList(dbUsers, onlineUsers);

    socket.emit(EVENTS.USER_LIST_UPDATED, userList);
  });

  socket.on(EVENTS.DISCONNECT, async () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      onlineUsers.delete(socket.id);

      await setUserOnlineStatus(userData.userId, 'offline', new Date().toISOString());

      // Fetch updated user list after user went offline
      const dbUsers = await getAllUsersFromDB();
      const userList = buildUserList(dbUsers, onlineUsers);

      io.emit(EVENTS.USER_OFFLINE, { userId: userData.userId, username: userData.username });
      io.emit(EVENTS.USER_LIST_UPDATED, userList);

      console.log(`User ${userData.username} went offline. Updated online users:`, Array.from(onlineUsers.values()));
    }
  });
};
