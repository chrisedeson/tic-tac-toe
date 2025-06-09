// backend/src/socket/handlers/chatHandler.js
const { EVENTS } = require("../events");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../../config/db");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

module.exports.initChatHandler = (io, socket, onlineUsers) => {
  // Save to DynamoDB
  const saveMessageToDB = async ({ messagePayload }) => {
    const params = {
      TableName: "messages",
      Item: {
        messageID: messagePayload.id,
        senderId: messagePayload.senderId,
        receiverId: messagePayload.receiverId || null,
        messageContent: messagePayload.messageContent,
        senderUsername: messagePayload.senderUsername,
        messageType: messagePayload.messageType,
        timestamp: messagePayload.timestamp,
      },
    };
    try {
      await docClient.send(new PutCommand(params));
    } catch (err) {
      console.error("Error saving message to DB:", err);
    }
  };

  // Fetch public history
  const fetchPublicMessages = async () => {
    const params = {
      TableName: "messages",
      FilterExpression: "messageType = :type",
      ExpressionAttributeValues: { ":type": "public" },
    };
    try {
      const data = await docClient.send(new ScanCommand(params));
      return data.Items || [];
    } catch (err) {
      console.error("Error fetching public messages:", err);
      return [];
    }
  };

  // Fetch private history
  const fetchPrivateMessages = async (me, other) => {
    const params = {
      TableName: "messages",
      FilterExpression:
        "(senderId = :me AND receiverId = :other) OR (senderId = :other AND receiverId = :me)",
      ExpressionAttributeValues: {
        ":me": me,
        ":other": other,
      },
    };
    try {
      const data = await docClient.send(new ScanCommand(params));
      return data.Items || [];
    } catch (err) {
      console.error("Error fetching private messages:", err);
      return [];
    }
  };

  // On user online → send public history
  socket.on(EVENTS.USER_ONLINE, async ({ userId }) => {
    const history = await fetchPublicMessages();
    socket.emit(EVENTS.CHAT_MESSAGE_RECEIVE, history);
  });

  // Public send/broadcast
  socket.on(EVENTS.CHAT_MESSAGE_SEND, async ({ userId, message }) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;

    const messagePayload = {
      id: uuidv4(),
      senderId: sender.userId,
      senderUsername: sender.username,
      receiverId: null,
      messageContent: message,
      messageType: "public",
      timestamp: new Date().toISOString(),
    };

    io.emit(EVENTS.CHAT_MESSAGE_RECEIVE, messagePayload);
    await saveMessageToDB({ messagePayload });
  });

  // Private send
  socket.on(EVENTS.CHAT_PRIVATE_MESSAGE_SEND, async ({ toUserId, message }) => {
    const fromUser = onlineUsers.get(socket.id);
    const toUser = [...onlineUsers.values()].find((u) => u.userId === toUserId);
    if (!fromUser || !toUser) return;

    const messagePayload = {
      id: uuidv4(),
      senderId: fromUser.userId,
      receiverId: toUserId,
      senderUsername: fromUser.username,
      messageContent: message,
      messageType: "private",
      timestamp: new Date().toISOString(),
    };

    io.to(toUser.socketId).emit(
      EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE,
      messagePayload
    );
    io.to(fromUser.socketId).emit(
      EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE,
      messagePayload
    );
    await saveMessageToDB({ messagePayload });
  });

  // On‐demand fetch (public or private)
  socket.on(
    EVENTS.CHAT_FETCH_MESSAGES,
    async ({ type, currentUserId, otherUserId }) => {
      let history = [];
      if (type === "public") {
        history = await fetchPublicMessages();
      } else if (type === "private") {
        history = await fetchPrivateMessages(currentUserId, otherUserId);
      }
      socket.emit(
        type === "public"
          ? EVENTS.CHAT_MESSAGE_RECEIVE
          : EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE,
        history
      );
    }
  );
};
