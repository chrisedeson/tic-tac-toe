// backend/src/socket/handlers/chatHandler.js
const { EVENTS } = require('../events');
const { v4: uuidv4 } = require('uuid');

// In a real app, you would persist messages to DynamoDB here.

module.exports.initChatHandler = (io, socket, onlineUsers) => {
  const sendMessage = (messageData) => {
    // Here you would save the message to DynamoDB Messages table
    // For now, we just broadcast it.
    io.emit(EVENTS.CHAT_MESSAGE_RECEIVE, messageData);
  };

  const sendPrivateMessage = ({ toUserId, message }) => {
    // Here you would save the message to DynamoDB
    const recipientSocket = [...onlineUsers.values()].find(u => u.userId === toUserId);

    if (recipientSocket) {
      // Send to the recipient's private room
      io.to(toUserId).emit(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, message);
      // Also send back to the sender so it appears in their chat window
      socket.emit(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, message);
    } else {
      // Handle offline messaging if desired
      socket.emit(EVENTS.NOTIFICATION_RECEIVE, {
        type: 'error',
        message: 'User is offline. Message not sent.',
      });
    }
  };

  socket.on(EVENTS.CHAT_MESSAGE_SEND, (messageText) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;

    const messageData = {
      id: uuidv4(),
      senderId: sender.userId,
      senderUsername: sender.username,
      text: messageText, // Remember to sanitize this input!
      timestamp: new Date().toISOString(),
      channel: 'community',
    };
    sendMessage(messageData);
  });

  socket.on(EVENTS.CHAT_PRIVATE_MESSAGE_SEND, ({ toUserId, messageText }) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;

    const messageData = {
      messageID: uuidv4(),
      senderId: sender.userId,
      senderUsername: sender.username,
      recipientId: toUserId,
      text: messageText, // Sanitize!
      timestamp: new Date().toISOString(),
      channel: `private_${[sender.userId, toUserId].sort().join('_')}`, // Create a consistent private channel ID
    };
    sendPrivateMessage({ toUserId, message: messageData });
  });
};