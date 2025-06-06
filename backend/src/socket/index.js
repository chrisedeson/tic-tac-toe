// backend/src/socket/index.js
const { initChatHandler } = require('./handlers/chatHandler');
const { initGameHandler } = require('./handlers/gameHandler');
const { initUserHandler } = require('./handlers/userHandler');
const { EVENTS } = require('./events'); // Assuming events.js defines event names

const onlineUsers = new Map(); // Stores socket.id -> { userId, username }

module.exports = (io) => {
  io.on(EVENTS.CONNECTION, (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Initialize handlers
    initUserHandler(io, socket, onlineUsers);
    initChatHandler(io, socket, onlineUsers);
    initGameHandler(io, socket, onlineUsers);

    socket.on(EVENTS.DISCONNECT, (reason) => {
      console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
      const userData = onlineUsers.get(socket.id);
      if (userData) {
        onlineUsers.delete(socket.id);
        // Update user status in DB to offline and lastSeen
        // userService.setUserOffline(userData.userId); // Example service call
        io.emit(EVENTS.USER_OFFLINE, { userId: userData.userId, username: userData.username });
        io.emit(EVENTS.USER_LIST_UPDATED, Array.from(onlineUsers.values()));
        console.log('Updated online users:', Array.from(onlineUsers.values()));
      }
    });
  });
};