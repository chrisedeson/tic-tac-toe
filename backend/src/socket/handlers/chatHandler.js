// backend/src/socket/handlers/chatHandler.js
const { EVENTS } = require("../events");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../../config/db");
const { PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

module.exports.initChatHandler = (io, socket, onlineUsers) => {
  // ---------------------- Save Message to DB ----------------------
  const saveMessageToDB = async ({ messagePayload }) => {
    const params = {
      TableName: "messages",
      Item: {
        messageID: messagePayload.id,
        senderId: messagePayload.senderId,
        receiverId: messagePayload.receiverId || null,
        messageContent: messagePayload.messageContent,
        senderUsername: messagePayload.senderUsername,
        messageType: messagePayload.messageType, // "public" or "private"
        timestamp: messagePayload.timestamp,
      },
    };

    try {
      await docClient.send(new PutCommand(params));
    } catch (error) {
      console.error("Error saving message to DB:", error);
    }
  };

  // ---------------------- Fetch Public Messages ----------------------
  const fetchPublicMessages = async () => {
    const params = {
      TableName: "messages",
      FilterExpression: "messageType = :type",
      ExpressionAttributeValues: {
        ":type": "public",
      },
    };

    try {
      const data = await docClient.send(new ScanCommand(params));
      return data.Items || [];
    } catch (error) {
      console.error("Error fetching public messages:", error);
      return [];
    }
  };

  // ---------------------- On New User Online ----------------------
  socket.on(EVENTS.USER_ONLINE, async ({ userId }) => {
    const publicMessages = await fetchPublicMessages();

    // Send past public messages to the new user
    socket.emit(EVENTS.CHAT_MESSAGE_RECEIVE, publicMessages);
  });

  // ---------------------- Handle Public Message ----------------------
  socket.on(EVENTS.CHAT_MESSAGE_SEND, async ({ userId, message }) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;

    const messageId = uuidv4();

    const messagePayload = {
      id: messageId,
      senderId: sender.userId,
      senderUsername: sender.username,
      messageContent: message,
      messageType: "public",
      timestamp: new Date().toISOString(),
    };

    // Broadcast to everyone
    io.emit(EVENTS.CHAT_MESSAGE_RECEIVE, [messagePayload]);

    // Save to DB
    await saveMessageToDB({ messagePayload });
  });

  // ---------------------- Handle Private Message ----------------------
  socket.on(EVENTS.CHAT_PRIVATE_MESSAGE_SEND, async ({ toUserId, message }) => {
    const fromUser = onlineUsers.get(socket.id);
    const toUser = [...onlineUsers.values()].find((u) => u.userId === toUserId);
    if (!fromUser || !toUser) return;

    const messageId = uuidv4();

    const messagePayload = {
      id: messageId,
      senderId: fromUser.userId,
      receiverId: toUserId,
      senderUsername: fromUser.username,
      messageContent: message,
      messageType: "private",
      timestamp: new Date().toISOString(),
    };

    // Send only to recipient and sender
    io.to(toUser.socketId).emit(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, messagePayload);
    io.to(fromUser.socketId).emit(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, messagePayload);

    // Save to DB
    await saveMessageToDB({ messagePayload });
  });

  // backend/src/socket/handlers/chatHandler.js
socket.on(EVENTS.CHAT_FETCH_MESSAGES, async ({ type, currentUserId, otherUserId }) => {
  const params = {
    TableName: "messages",
    FilterExpression: "",
    ExpressionAttributeValues: {},
  };

  if (type === "public") {
    params.FilterExpression = "messageType = :type";
    params.ExpressionAttributeValues = { ":type": "public" };
  } else if (type === "private") {
    params.FilterExpression =
      "(senderId = :me AND receiverId = :other) OR (senderId = :other AND receiverId = :me)";
    params.ExpressionAttributeValues = {
      ":me": currentUserId,
      ":other": otherUserId,
    };
  }

  try {
    const data = await docClient.send(new ScanCommand(params));
    socket.emit(
      type === "public" ? EVENTS.CHAT_MESSAGE_RECEIVE : EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE,
      data.Items || []
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
  }
});

};
