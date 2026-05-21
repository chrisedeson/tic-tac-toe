// backend/src/socket/handlers/userHandler.js
const { EVENTS } = require('../events');
const { getDB } = require('../../config/db');

const setUserOnlineStatus = async (userId, status, lastSeen = null) => {
  const setFields = { status };
  if (lastSeen) {
    setFields.lastSeen = lastSeen;
  }
  try {
    await getDB()
      .collection('users')
      .updateOne({ _id: userId }, { $set: setFields });
    console.log(`User ${userId} status updated to ${status}`);
  } catch (error) {
    console.error(`Error updating user ${userId} status:`, error);
  }
};

// Fetch all users from MongoDB
const getAllUsersFromDB = async () => {
  try {
    return await getDB().collection('users').find({}).toArray();
  } catch (error) {
    console.error('Error fetching all users from DB:', error);
    return [];
  }
};

// Build combined user list merging DB users and online users
const buildUserList = (dbUsers, onlineUsers) => {
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
    console.log(
      `User ${username} (${userId}) attempting to go online with socket ${socket.id}`
    );

    onlineUsers.set(socket.id, { userId, username, socketId: socket.id });

    // Update user status in DB (non-blocking)
    setUserOnlineStatus(userId, 'online').catch(console.error);

    socket.data.userId = userId;
    socket.data.username = username;

    const dbUsers = await getAllUsersFromDB();
    const userList = buildUserList(dbUsers, onlineUsers);

    io.emit(EVENTS.USER_LIST_UPDATED, userList);

    console.log('Updated online users:', Array.from(onlineUsers.values()));

    socket.join(userId);
  });

  socket.on(EVENTS.GET_USER_LIST, async () => {
    const dbUsers = await getAllUsersFromDB();
    const userList = buildUserList(dbUsers, onlineUsers);

    socket.emit(EVENTS.USER_LIST_UPDATED, userList);
  });

  socket.on(EVENTS.DISCONNECT, async () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      onlineUsers.delete(socket.id);

      await setUserOnlineStatus(
        userData.userId,
        'offline',
        new Date().toISOString()
      );

      const dbUsers = await getAllUsersFromDB();
      const userList = buildUserList(dbUsers, onlineUsers);

      io.emit(EVENTS.USER_OFFLINE, {
        userId: userData.userId,
        username: userData.username,
      });
      io.emit(EVENTS.USER_LIST_UPDATED, userList);

      console.log(
        `User ${userData.username} went offline. Updated online users:`,
        Array.from(onlineUsers.values())
      );
    }
  });
};
