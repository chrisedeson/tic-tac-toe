# MongoDB Atlas Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the backend's AWS DynamoDB data layer with MongoDB so the app runs free of AWS.

**Architecture:** In-place swap — each DynamoDB call is replaced with the equivalent MongoDB native-driver call, keeping the current file layout. A new `config/db.js` manages a single shared `MongoClient`. No ODM. Per the spec, there is no automated test suite — verification is a runtime smoke test in the final task.

**Tech Stack:** Node.js 22, Express 5, Socket.IO 4, MongoDB native driver v6, MongoDB Atlas (M0).

**Spec:** `docs/superpowers/specs/2026-05-21-mongodb-migration-design.md`

**Branch:** `migrate-to-mongodb`

---

## Notes for the executor

- **Verification model:** The backend is an interconnected app — it cannot fully boot until *every* DB file is migrated. Per-task verification is therefore `node --check <file>` (syntax only). The real runtime verification happens once in **Task 16**.
- **`findOneAndUpdate` return value:** With MongoDB driver **v6**, `findOneAndUpdate(filter, update, { returnDocument: 'after' })` returns the **document itself** (or `null`) — not a `{ value }` wrapper. All code below relies on this v6 behavior.
- **No `upsert` anywhere:** Unlike DynamoDB's `UpdateCommand`, MongoDB `updateOne`/`findOneAndUpdate` do **not** auto-create a missing document. This is intentional and correct here — every update call site targets a user who already registered (and therefore exists). It also stops stale client IDs from creating junk records.
- **`_id` strategy:** Each document's `_id` is set to the existing UUID, and the original `userID`/`gameID`/`messageID` field is kept too, so existing `.userID` reads keep working.
- Run all `pnpm` and `node` commands from the `backend/` directory unless stated otherwise.

---

## Task 1: Update backend dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Remove AWS SDK packages and add MongoDB + uuid**

Run from `backend/`:

```bash
cd backend
pnpm remove @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb aws-sdk
pnpm add mongodb uuid
```

Expected: `pnpm` rewrites `backend/package.json` — `dependencies` no longer lists any `@aws-sdk/*` or `aws-sdk`, and now includes `mongodb` (^6.x) and `uuid` (^11.x).

- [ ] **Step 2: Add a Node engines floor**

Edit `backend/package.json` — find:

```json
  "packageManager": "pnpm@10.10.0",
```

Replace with:

```json
  "packageManager": "pnpm@10.10.0",
  "engines": {
    "node": ">=20.0.0"
  },
```

- [ ] **Step 3: Verify**

Run:

```bash
node -e "const p=require('./package.json'); console.log(Object.keys(p.dependencies)); console.log('engines:',p.engines)"
```

Expected: the dependency list contains `mongodb` and `uuid` and **no** `aws-sdk`/`@aws-sdk/*`; `engines: { node: '>=20.0.0' }`.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json
git commit -m "build: replace AWS SDK deps with mongodb and uuid"
```

---

## Task 2: Convert `socket/events.js` to CommonJS

The file currently uses ESM `export` syntax inside a CommonJS project. It only works on Node ≥22 via syntax auto-detection — fragile on other runtimes. Convert it to plain CommonJS.

**Files:**
- Modify: `backend/src/socket/events.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/socket/events.js` with:

```js
// backend/src/socket/events.js
const EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // User Status & List
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_LIST_UPDATED: 'user:list_updated',
  GET_USER_LIST: 'user:get_list',

  // Chat
  CHAT_MESSAGE_SEND: 'chat:message:send',
  CHAT_MESSAGE_RECEIVE: 'chat:message:receive',
  CHAT_PRIVATE_MESSAGE_SEND: 'chat:private_message:send',
  CHAT_PRIVATE_MESSAGE_RECEIVE: 'chat:private_message:receive',
  CHAT_FETCH_MESSAGES: 'chat:fetch_messages',

  // Game & Challenge
  CHALLENGE_SEND: 'challenge:send',
  CHALLENGE_RECEIVE: 'challenge:receive',
  CHALLENGE_RESPONSE: 'challenge:response',
  CHALLENGE_RESULT: 'challenge:result',
  GAME_START: 'game:start',
  GAME_MOVE_MAKE: 'game:move:make',
  GAME_MOVE_RECEIVE: 'game:move:receive',
  GAME_STATE_UPDATE: 'game:state_update',
  GAME_TIMER_UPDATE: 'game:timer_update',
  GAME_TIMEOUT: 'game:timeout',
  GAME_END: 'game:end',
  REMATCH_REQUEST: 'rematch:request',
  REMATCH_RECEIVE: 'rematch:receive',
  REMATCH_RESPONSE: 'rematch:response',
  REMATCH_RESULT: 'rematch:result',

  // Notifications
  NOTIFICATION_RECEIVE: 'notification:receive',

  // Christopher (AI) specific
  CHALLENGE_CHRISTOPHER: 'christopher:challenge',
};

module.exports = { EVENTS };
```

- [ ] **Step 2: Verify syntax and exports**

Run:

```bash
node -e "const {EVENTS}=require('./src/socket/events.js'); console.log('keys:', Object.keys(EVENTS).length)"
```

Expected: `keys: 28`

- [ ] **Step 3: Commit**

```bash
git add backend/src/socket/events.js
git commit -m "refactor: convert socket/events.js to CommonJS"
```

---

## Task 3: Rewrite `config/index.js`

**Files:**
- Modify: `backend/src/config/index.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/config/index.js` with:

```js
// backend/src/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'tictactoe',
  },
  corsOptions: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/config/index.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/index.js
git commit -m "refactor: replace AWS config with MongoDB config"
```

---

## Task 4: Rewrite `config/db.js`

**Files:**
- Modify: `backend/src/config/db.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/config/db.js` with:

```js
// backend/src/config/db.js
const { MongoClient } = require('mongodb');
const config = require('./index');

let client = null;
let db = null;

/**
 * Connects to MongoDB once and caches the database handle.
 * Safe to call multiple times — returns the cached handle after the first call.
 */
async function connectDB() {
  if (db) return db;
  if (!config.mongodb.uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  client = new MongoClient(config.mongodb.uri);
  await client.connect();
  db = client.db(config.mongodb.dbName);
  console.log(`✅ Connected to MongoDB database "${config.mongodb.dbName}"`);
  return db;
}

/**
 * Returns the connected database handle.
 * Throws if connectDB() has not completed yet.
 */
function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

/**
 * Creates the indexes the app relies on. Idempotent.
 */
async function ensureIndexes() {
  const database = getDB();
  await database.collection('messages').createIndex({ messageType: 1 });
  await database.collection('messages').createIndex({ senderId: 1, receiverId: 1 });
  console.log('✅ MongoDB indexes ensured');
}

module.exports = { connectDB, getDB, ensureIndexes };
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/config/db.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/db.js
git commit -m "feat: add MongoDB connection module"
```

---

## Task 5: Rewrite `controllers/authController.js`

**Files:**
- Modify: `backend/src/controllers/authController.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/controllers/authController.js` with:

```js
// backend/src/controllers/authController.js
const { getDB } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.registerOrLoginUser = async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Name is required' });
  }

  const sanitizedName = name.trim();

  try {
    const userId = uuidv4();

    const userItem = {
      _id: userId,
      userID: userId,
      username: sanitizedName,
      lastSeen: new Date().toISOString(),
      status: 'offline',
      gameStatus: 'offline',
      wins: 0,
      losses: 0,
      draws: 0,
    };

    await getDB().collection('users').insertOne(userItem);

    res.status(201).json({
      message: 'User registered/updated successfully',
      user: {
        userID: userItem.userID,
        username: userItem.username,
        wins: userItem.wins,
        losses: userItem.losses,
        draws: userItem.draws,
        gameStatus: userItem.gameStatus,
      },
    });
  } catch (error) {
    console.error('Error in registerOrLoginUser:', error);
    res
      .status(500)
      .json({ message: 'Error processing user registration', error: error.message });
  }
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/controllers/authController.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/authController.js
git commit -m "refactor: migrate authController to MongoDB"
```

---

## Task 6: Rewrite `controllers/userController.js`

**Files:**
- Modify: `backend/src/controllers/userController.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/controllers/userController.js` with:

```js
// backend/src/controllers/userController.js
const { getDB } = require('../config/db');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await getDB()
      .collection('users')
      .find(
        {},
        { projection: { userID: 1, username: 1, lastSeen: 1, status: 1, gameStatus: 1 } }
      )
      .toArray();

    const formatted = users.map((item) => ({
      userId: item.userID,
      username: item.username,
      lastSeen: item.lastSeen,
      status: item.status,
      gameStatus: item.gameStatus,
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Update game status (returns the updated user document, or null)
const updateGameStatus = async (userId, status) => {
  if (!userId || !status) {
    console.error('Missing userId or status');
    return null;
  }

  try {
    const updated = await getDB()
      .collection('users')
      .findOneAndUpdate(
        { _id: userId },
        { $set: { gameStatus: status } },
        { returnDocument: 'after' }
      );
    return updated;
  } catch (error) {
    console.error(`Failed to update game status for user ${userId}:`, error);
    return null;
  }
};

// Start game route
const startGame = async (req, res) => {
  const { userId } = req.params;

  try {
    const updatedUser = await updateGameStatus(userId, 'playing');
    if (updatedUser) {
      return res.status(200).json({ message: 'Game started', user: updatedUser });
    }
    return res.status(500).json({ message: 'Failed to start the game' });
  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// End game route
const endGame = async (req, res) => {
  const { userId } = req.params;

  try {
    const updatedUser = await updateGameStatus(userId, 'offline');
    if (updatedUser) {
      return res.status(200).json({ message: 'Game ended', user: updatedUser });
    }
    return res.status(500).json({ message: 'Failed to end the game' });
  } catch (error) {
    console.error('Error ending game:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user by ID route
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await getDB().collection('users').findOne({ _id: id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user presence (status and lastSeen)
const updatePresence = async (req, res) => {
  const { userId } = req.params;
  const { status, lastSeen } = req.body;

  if (!userId || !status) {
    return res.status(400).json({ message: 'userId and status are required' });
  }

  const setFields = { status };
  if (lastSeen) {
    setFields.lastSeen = lastSeen;
  }

  try {
    const updated = await getDB()
      .collection('users')
      .findOneAndUpdate(
        { _id: userId },
        { $set: setFields },
        { returnDocument: 'after' }
      );
    return res.status(200).json({ message: 'Presence updated', attributes: updated });
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
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/controllers/userController.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/userController.js
git commit -m "refactor: migrate userController to MongoDB"
```

---

## Task 7: Rewrite `services/userService.js`

**Files:**
- Modify: `backend/src/services/userService.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/services/userService.js` with:

```js
// backend/src/services/userService.js
const { getDB } = require('../config/db');

exports.updateUserStats = async (userId, result) => {
  if (userId === 'christopher' || !userId) return null;

  const key = result === 'wins' ? 'wins' : result === 'losses' ? 'losses' : 'draws';

  try {
    const updated = await getDB()
      .collection('users')
      .findOneAndUpdate(
        { _id: userId },
        { $inc: { [key]: 1 } },
        { returnDocument: 'after' }
      );
    return updated;
  } catch (error) {
    console.error(`Failed to update stats for user ${userId}:`, error);
    return null;
  }
};

exports.getUserProfile = async (userId) => {
  try {
    const user = await getDB().collection('users').findOne({ _id: userId });
    return user;
  } catch (error) {
    console.error(`Failed to get user profile for ${userId}:`, error);
    return null;
  }
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/services/userService.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/userService.js
git commit -m "refactor: migrate userService to MongoDB"
```

---

## Task 8: Rewrite `routes/userStatsRoutes.js`

This file currently uses the old **aws-sdk v2**. Rewrite it on the MongoDB driver.

**Files:**
- Modify: `backend/src/routes/userStatsRoutes.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/routes/userStatsRoutes.js` with:

```js
// backend/src/routes/userStatsRoutes.js
const express = require('express');
const { getDB } = require('../config/db');

const router = express.Router();

// Fetch user stats endpoint
router.get('/user/:userId/stats', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await getDB().collection('users').findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { wins, losses, draws } = user;
    return res.json({ wins, losses, draws });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

module.exports = router;
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/routes/userStatsRoutes.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/userStatsRoutes.js
git commit -m "refactor: migrate userStatsRoutes to MongoDB (drop aws-sdk v2)"
```

---

## Task 9: Rewrite `services/cleanupService.js`

**Files:**
- Modify: `backend/src/services/cleanupService.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/services/cleanupService.js` with:

```js
// backend/src/services/cleanupService.js
const { getDB } = require('../config/db');

/**
 * Deletes any users document whose username is missing, null, non-string,
 * empty, or whitespace-only.
 */
async function cleanupInvalidUsers() {
  console.log('[Cleanup] Starting invalid user cleanup');

  const result = await getDB()
    .collection('users')
    .deleteMany({
      $or: [
        { username: { $not: { $type: 'string' } } }, // missing, null, or non-string
        { username: { $regex: /^\s*$/ } }, // empty or whitespace-only string
      ],
    });

  console.log(
    `[Cleanup] Completed invalid user cleanup, removed ${result.deletedCount}`
  );
}

module.exports = { cleanupInvalidUsers };
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/services/cleanupService.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/cleanupService.js
git commit -m "refactor: migrate cleanupService to MongoDB"
```

---

## Task 10: Rewrite `socket/index.js`

**Files:**
- Modify: `backend/src/socket/index.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/socket/index.js` with:

```js
// backend/src/socket/index.js
const { initChatHandler } = require('./handlers/chatHandler');
const { initGameHandler } = require('./handlers/gameHandler');
const { initUserHandler } = require('./handlers/userHandler');
const { EVENTS } = require('./events');
const { getDB } = require('../config/db');

const onlineUsers = new Map();

// Helper to update user status in MongoDB
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
          await setUserOnlineStatus(
            userData.userId,
            'offline',
            new Date().toISOString()
          );
        } catch (error) {
          console.error(`Failed to update user status on disconnect:`, error);
        }

        io.emit(EVENTS.USER_OFFLINE, {
          userId: userData.userId,
          username: userData.username,
        });

        io.emit(
          EVENTS.USER_LIST_UPDATED,
          Array.from(onlineUsers.values()).map((u) => ({
            userId: u.userId,
            username: u.username,
            lastSeen: 'Online',
          }))
        );

        console.log('Updated online users:', Array.from(onlineUsers.values()));
      }
    });
  });
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/socket/index.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/socket/index.js
git commit -m "refactor: migrate socket/index.js to MongoDB"
```

---

## Task 11: Rewrite `socket/handlers/chatHandler.js`

**Files:**
- Modify: `backend/src/socket/handlers/chatHandler.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/socket/handlers/chatHandler.js` with:

```js
// backend/src/socket/handlers/chatHandler.js
const { EVENTS } = require('../events');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../../config/db');

module.exports.initChatHandler = (io, socket, onlineUsers) => {
  // Save a message to MongoDB
  const saveMessageToDB = async ({ messagePayload }) => {
    try {
      await getDB().collection('messages').insertOne({
        _id: messagePayload.id,
        messageID: messagePayload.id,
        senderId: messagePayload.senderId,
        receiverId: messagePayload.receiverId || null,
        messageContent: messagePayload.messageContent,
        senderUsername: messagePayload.senderUsername,
        messageType: messagePayload.messageType,
        timestamp: messagePayload.timestamp,
      });
    } catch (err) {
      console.error('Error saving message to DB:', err);
    }
  };

  // Fetch public history (chronological)
  const fetchPublicMessages = async () => {
    try {
      return await getDB()
        .collection('messages')
        .find({ messageType: 'public' })
        .sort({ timestamp: 1 })
        .toArray();
    } catch (err) {
      console.error('Error fetching public messages:', err);
      return [];
    }
  };

  // Fetch private history between two users (chronological)
  const fetchPrivateMessages = async (me, other) => {
    try {
      return await getDB()
        .collection('messages')
        .find({
          $or: [
            { senderId: me, receiverId: other },
            { senderId: other, receiverId: me },
          ],
        })
        .sort({ timestamp: 1 })
        .toArray();
    } catch (err) {
      console.error('Error fetching private messages:', err);
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
      messageType: 'public',
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
      messageType: 'private',
      timestamp: new Date().toISOString(),
    };

    io.to(toUser.socketId).emit(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, messagePayload);
    io.to(fromUser.socketId).emit(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, messagePayload);
    await saveMessageToDB({ messagePayload });
  });

  // On-demand fetch (public or private)
  socket.on(
    EVENTS.CHAT_FETCH_MESSAGES,
    async ({ type, currentUserId, otherUserId }) => {
      let history = [];
      if (type === 'public') {
        history = await fetchPublicMessages();
      } else if (type === 'private') {
        history = await fetchPrivateMessages(currentUserId, otherUserId);
      }
      socket.emit(
        type === 'public'
          ? EVENTS.CHAT_MESSAGE_RECEIVE
          : EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE,
        history
      );
    }
  );
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/socket/handlers/chatHandler.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/socket/handlers/chatHandler.js
git commit -m "refactor: migrate chatHandler to MongoDB"
```

---

## Task 12: Rewrite `socket/handlers/userHandler.js`

**Files:**
- Modify: `backend/src/socket/handlers/userHandler.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/socket/handlers/userHandler.js` with:

```js
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
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/socket/handlers/userHandler.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/socket/handlers/userHandler.js
git commit -m "refactor: migrate userHandler to MongoDB"
```

---

## Task 13: Rewrite `socket/handlers/gameHandler.js`

**Files:**
- Modify: `backend/src/socket/handlers/gameHandler.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/socket/handlers/gameHandler.js` with:

```js
// backend/src/socket/handlers/gameHandler.js
const { v4: uuidv4 } = require('uuid');
const { EVENTS } = require('../events');
const gameService = require('../../services/gameService');
const { updateGameStatus } = require('../../controllers/userController');
const { getDB } = require('../../config/db');

const activeGames = new Map();

// ---------------------- Update Game in DB ----------------------
const updateGameInDB = async (gameId, updateData) => {
  console.log('[MongoDB] updateGameInDB called with:', { gameId, updateData });
  if (!gameId) {
    console.error('[MongoDB] Missing gameId');
    return null;
  }

  const setFields = {};
  for (const key in updateData) {
    if (key === 'gameID') continue; // never overwrite the id
    if (updateData[key] === undefined) continue;
    setFields[key] = updateData[key];
  }

  if (Object.keys(setFields).length === 0) {
    console.warn('[MongoDB] No updatable fields found in updateData:', updateData);
    return null;
  }

  try {
    const updated = await getDB()
      .collection('games')
      .findOneAndUpdate(
        { _id: gameId },
        { $set: setFields },
        { returnDocument: 'after' }
      );
    console.log('[MongoDB] Update successful:', updated);
    return updated;
  } catch (error) {
    console.error(`[MongoDB] Failed to update game ${gameId}:`, error);
    return null;
  }
};

// ---------------------- Create New Game ----------------------
const createNewGame = async ({ player1, player2 }) => {
  const gameID = uuidv4();
  const userID = player1.userId;

  const game = {
    gameID,
    userID,
    playerX: player1,
    playerO: player2,
    board: Array(9).fill(null),
    currentPlayerId: player1.userId,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await getDB().collection('games').insertOne({ _id: gameID, ...game });

  activeGames.set(gameID, { ...game, moveTimer: null });

  return game;
};

// ---------------------- Start Game ----------------------
const startGame = (io, game) => {
  const payload = {
    gameID: game.gameID,
    board: game.board,
    currentPlayerId: game.currentPlayerId,
    scores: { wins: 0, losses: 0, draws: 0 },
    opponent: {
      userId: game.playerO.userId,
      username: game.playerO.username,
    },
    playerSymbol: 'X',
  };

  io.to(game.playerX.socketId).emit(EVENTS.GAME_START, payload);

  if (game.playerO.userId !== 'christopher') {
    io.to(game.playerO.socketId).emit(EVENTS.GAME_START, {
      ...payload,
      opponent: {
        userId: game.playerX.userId,
        username: game.playerX.username,
      },
      playerSymbol: 'O',
    });
  }
};

// ---------------------- Move Timer ----------------------
const startMoveTimer = (io, gameID) => {
  const game = activeGames.get(gameID);
  if (!game || game.status !== 'active') return;

  if (game.moveTimer) {
    clearInterval(game.moveTimer);
    game.moveTimer = null;
  }

  let timeLeft = 10;

  const emitTime = () => {
    io.to(game.playerX.socketId).emit(EVENTS.GAME_TIMER_UPDATE, {
      timeLeft,
      currentPlayerId: game.currentPlayerId,
    });
    if (game.playerO.socketId) {
      io.to(game.playerO.socketId).emit(EVENTS.GAME_TIMER_UPDATE, {
        timeLeft,
        currentPlayerId: game.currentPlayerId,
      });
    }
  };

  emitTime();

  game.moveTimer = setInterval(() => {
    timeLeft--;
    emitTime();

    if (timeLeft <= 0) {
      clearInterval(game.moveTimer);
      game.moveTimer = null;

      const winnerId =
        game.currentPlayerId === game.playerX.userId
          ? game.playerO.userId
          : game.playerX.userId;

      endGame(io, gameID, winnerId, 'timeout');
    }
  }, 1000);

  activeGames.set(gameID, game);
};

// ---------------------- End Game ----------------------
const endGame = async (io, gameID, winnerId, reason = 'win') => {
  const game = activeGames.get(gameID);
  if (!game || game.status === 'completed') return;

  if (game.moveTimer) {
    clearInterval(game.moveTimer);
    game.moveTimer = null;
  }

  // Notify both players about the game result
  io.to(game.playerX.socketId).emit(EVENTS.GAME_END, { winnerId, reason });
  if (game.playerO.socketId) {
    io.to(game.playerO.socketId).emit(EVENTS.GAME_END, { winnerId, reason });
  }

  // Reset gameStatus back to offline for both players
  await updateGameStatus(game.playerX.userId, 'offline');
  if (game.playerO.userId !== 'christopher') {
    await updateGameStatus(game.playerO.userId, 'offline');
  }

  // Update the game record in the database
  await updateGameInDB(gameID, {
    userID: game.userID,
    status: 'completed',
    winner: winnerId,
    updatedAt: new Date().toISOString(),
  });

  // Update wins, losses, and draws for a player
  const updatePlayerStats = async (userId, result) => {
    // Skip the AI so we never touch a DB record for 'christopher'
    if (userId === 'christopher') return;

    try {
      await getDB()
        .collection('users')
        .updateOne(
          { _id: userId },
          {
            $inc: {
              wins: result === 'win' ? 1 : 0,
              losses: result === 'loss' ? 1 : 0,
              draws: result === 'draw' ? 1 : 0,
            },
          }
        );
      console.log(`Player ${userId} stats updated: ${result}`);
    } catch (error) {
      console.error(`Failed to update player ${userId} stats:`, error);
    }
  };

  // Determine the results and update stats for both players
  if (winnerId === 'Draw') {
    await updatePlayerStats(game.playerX.userId, 'draw');
    await updatePlayerStats(game.playerO.userId, 'draw');
  } else {
    const loserId =
      winnerId === game.playerX.userId
        ? game.playerO.userId
        : game.playerX.userId;
    await updatePlayerStats(winnerId, 'win');
    await updatePlayerStats(loserId, 'loss');
  }

  activeGames.delete(gameID);
};

// ---------------------- Game Handler Initialization ----------------------
module.exports.initGameHandler = (io, socket, onlineUsers) => {
  socket.on(EVENTS.CHALLENGE_SEND, ({ toUserId }) => {
    const fromUser = onlineUsers.get(socket.id);
    const toUser = [...onlineUsers.values()].find((u) => u.userId === toUserId);
    if (fromUser && toUser) {
      io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RECEIVE, { fromUser });
    }
  });

  socket.on(EVENTS.CHALLENGE_RESPONSE, async ({ toUserId, accepted }) => {
    const fromUser = onlineUsers.get(socket.id);
    const toUser = [...onlineUsers.values()].find((u) => u.userId === toUserId);
    if (!fromUser || !toUser) return;

    if (accepted) {
      io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RESULT, {
        message: `${fromUser.username} accepted your challenge! Starting game...`,
      });

      const game = await createNewGame({ player1: toUser, player2: fromUser });

      // mark both players as playing
      await updateGameStatus(toUser.userId, 'playing');
      await updateGameStatus(fromUser.userId, 'playing');
      startGame(io, game);
      startMoveTimer(io, game.gameID);
    } else {
      io.to(toUser.socketId).emit(EVENTS.CHALLENGE_RESULT, {
        message: `${fromUser.username} declined your challenge.`,
      });
    }
  });

  socket.on(EVENTS.CHALLENGE_CHRISTOPHER, async () => {
    const fromUser = onlineUsers.get(socket.id);
    if (!fromUser) return;

    // mark the human as playing
    await updateGameStatus(fromUser.userId, 'playing');

    const christopher = {
      userId: 'christopher',
      username: 'Christopher',
      socketId: null,
    };
    const game = await createNewGame({
      player1: fromUser,
      player2: christopher,
    });

    startGame(io, game);
    startMoveTimer(io, game.gameID);
  });

  socket.on(EVENTS.GAME_MOVE_MAKE, async ({ gameId, cellIndex }) => {
    console.log(
      `[MOVE_MAKE] From ${socket.id}: gameId=${gameId}, cellIndex=${cellIndex}`
    );
    const game = activeGames.get(gameId);
    const player = onlineUsers.get(socket.id);

    if (
      !game ||
      !player ||
      !player.userId ||
      player.userId !== game.currentPlayerId
    )
      return;

    const symbol = player.userId === game.playerX.userId ? 'X' : 'O';
    game.board[cellIndex] = symbol;
    game.currentPlayerId =
      symbol === 'X' ? game.playerO.userId : game.playerX.userId;
    game.updatedAt = new Date().toISOString();

    if (game.moveTimer) {
      clearInterval(game.moveTimer);
      game.moveTimer = null;
    }

    const winnerSymbol = gameService.calculateWinner(game.board);
    if (winnerSymbol) {
      const winnerId =
        winnerSymbol === 'X' ? game.playerX.userId : game.playerO.userId;
      return endGame(io, gameId, winnerId);
    }

    if (gameService.isDraw(game.board)) {
      return endGame(io, gameId, 'Draw', 'draw');
    }

    io.to(game.playerX.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
      board: game.board,
      currentPlayerId: game.currentPlayerId,
    });
    if (game.playerO.socketId) {
      io.to(game.playerO.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
        board: game.board,
        currentPlayerId: game.currentPlayerId,
      });
    }

    if (game.currentPlayerId === 'christopher') {
      setTimeout(() => {
        const latestGame = activeGames.get(gameId);
        if (!latestGame || latestGame.status !== 'active') return;

        const aiMove = gameService.getChristopherMove(latestGame.board);
        latestGame.board[aiMove] = 'O';
        latestGame.currentPlayerId = latestGame.playerX.userId;
        latestGame.updatedAt = new Date().toISOString();

        const aiWinner = gameService.calculateWinner(latestGame.board);
        if (aiWinner) return endGame(io, gameId, 'christopher');
        if (gameService.isDraw(latestGame.board))
          return endGame(io, gameId, 'Draw', 'draw');

        io.to(latestGame.playerX.socketId).emit(EVENTS.GAME_STATE_UPDATE, {
          board: latestGame.board,
          currentPlayerId: latestGame.currentPlayerId,
        });

        startMoveTimer(io, gameId);
        activeGames.set(gameId, latestGame);
      }, 1000);
    } else {
      startMoveTimer(io, gameId);
    }

    activeGames.set(gameId, game);
  });
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/socket/handlers/gameHandler.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/socket/handlers/gameHandler.js
git commit -m "refactor: migrate gameHandler to MongoDB"
```

---

## Task 14: Rewrite `server.js`

**Files:**
- Modify: `backend/src/server.js`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `backend/src/server.js` with:

```js
// backend/src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const userStatsRoutes = require('./routes/userStatsRoutes');
const setupSocketHandlers = require('./socket');
const { connectDB, getDB, ensureIndexes } = require('./config/db');
const { cleanupInvalidUsers } = require('./services/cleanupService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: config.corsOptions,
});

// Middleware
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', userStatsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// MongoDB connectivity check
app.get('/test-db', async (req, res) => {
  try {
    await getDB().command({ ping: 1 });
    res.json({ message: 'MongoDB is connected', status: 'ok' });
  } catch (error) {
    console.error('Error pinging MongoDB:', error);
    res.status(500).json({ error: 'Failed to connect to MongoDB' });
  }
});

// Initialize socket handlers
setupSocketHandlers(io);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

// === Startup ===
const TEN_MINUTES = 10 * 60 * 1000;

async function start() {
  await connectDB();
  await ensureIndexes();

  // Run cleanup once at startup
  cleanupInvalidUsers().catch((err) => {
    console.error('[Cleanup] Initial invalid user cleanup failed:', err);
  });

  // Schedule cleanup every 10 minutes
  setInterval(() => {
    cleanupInvalidUsers().catch((err) => {
      console.error('[Cleanup] Error during invalid user cleanup:', err);
    });
  }, TEN_MINUTES);

  server.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`🔌 Socket.IO active on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server, io };
```

- [ ] **Step 2: Verify syntax**

Run: `node --check src/server.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add backend/src/server.js
git commit -m "refactor: wire server startup to MongoDB, add /test-db"
```

---

## Task 15: Update `render.yaml`

**Files:**
- Modify: `render.yaml` (repo root)

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `render.yaml` with:

```yaml
# Render Blueprint — deploys the Tic-Tac-Toe Socket.IO backend.
# Spec: https://render.com/docs/blueprint-spec
services:
  - type: web
    name: tic-tac-toe-backend
    runtime: node
    rootDir: backend
    plan: free
    region: frankfurt          # Pick the region closest to you / your Atlas cluster.
    branch: master
    buildCommand: pnpm install
    startCommand: pnpm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      # PORT is injected automatically by Render — do not set it.
      - key: MONGODB_URI          # MongoDB Atlas connection string (secret)
        sync: false
      - key: MONGODB_DB_NAME      # Optional — defaults to "tictactoe"
        sync: false
      - key: FRONTEND_URL         # Frontend origin for CORS (set after deploying the frontend)
        sync: false
```

- [ ] **Step 2: Verify**

Run: `node -e "const fs=require('fs'); const t=fs.readFileSync('render.yaml','utf8'); console.log(/AWS|DYNAMODB/.test(t) ? 'STILL HAS AWS VARS' : 'clean'); console.log(/MONGODB_URI/.test(t) ? 'has MONGODB_URI' : 'MISSING MONGODB_URI')"` (run from repo root).
Expected: `clean` and `has MONGODB_URI`.

- [ ] **Step 3: Commit**

```bash
git add render.yaml
git commit -m "build: point render.yaml at MongoDB env vars"
```

---

## Task 16: Local verification (Docker MongoDB + smoke test)

This is the real runtime verification. It boots the migrated backend against a throwaway local MongoDB and exercises the HTTP endpoints.

**Files:**
- Create: `backend/.env` (git-ignored — not committed)

- [ ] **Step 1: Start a local MongoDB**

```bash
docker run -d --name ttt-mongo -p 27017:27017 mongo:7
```

Expected: prints a container id. (If the name is already in use, run `docker start ttt-mongo`.)

- [ ] **Step 2: Create `backend/.env`**

Create the file `backend/.env` with exactly:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=tictactoe
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 3: Start the backend**

```bash
cd backend
pnpm start
```

Expected console output includes:
```
✅ Connected to MongoDB database "tictactoe"
✅ MongoDB indexes ensured
[Cleanup] Completed invalid user cleanup, removed 0
🚀 Server running on port 5000
```
If the server exits with `❌ Failed to start server`, fix the reported error before continuing. Leave the server running for the next steps (use a second terminal).

- [ ] **Step 4: Verify HTTP endpoints**

In a second terminal:

```bash
curl -s localhost:5000/health
curl -s localhost:5000/test-db
```

Expected: `{"status":"ok"}` then `{"message":"MongoDB is connected","status":"ok"}`.

- [ ] **Step 5: Verify register → list → get → stats**

```bash
curl -s -X POST localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' -d '{"name":"SmokeTest"}'
curl -s localhost:5000/api/users
```

Expected: the register response contains a `user` with a `userID`, `username: "SmokeTest"`, and `wins/losses/draws: 0`. The users list contains that user.

Then, using the `userID` from the register response (substitute below):

```bash
curl -s localhost:5000/api/users/<userID>
curl -s localhost:5000/api/user/<userID>/stats
```

Expected: the user document is returned; stats returns `{"wins":0,"losses":0,"draws":0}`.

- [ ] **Step 6: (Optional) Full chat/game smoke test**

For the socket-based flows (chat, challenge, play, stats increment, move timeout), run the frontend locally in a third terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

Open the printed URL, then walk the spec's checklist: register a name → see the user list/presence → public chat → private chat (two browser tabs) → challenge a human and play → challenge Christopher (AI) and play → confirm win/loss/draw stats increment → let the 10-second move timer expire. (If skipped here, this checklist is run after the Render deploy instead.)

- [ ] **Step 7: Stop and clean up the local MongoDB**

Stop the backend (Ctrl+C), then:

```bash
docker stop ttt-mongo && docker rm ttt-mongo
```

- [ ] **Step 8: Confirm the working tree is clean**

```bash
git status
```

Expected: nothing to commit (`backend/.env` and `pnpm-lock.yaml` are git-ignored). The migration is complete on the `migrate-to-mongodb` branch.

---

## Post-plan: Deployment (handled with the user, not part of code execution)

1. Merge `migrate-to-mongodb` → `master` and push.
2. **User:** create the MongoDB Atlas M0 cluster, a DB user, network access `0.0.0.0/0`; copy the connection string.
3. **User:** create the Render service from `render.yaml` (Blueprint), connect the GitHub repo, paste `MONGODB_URI` (and optionally `MONGODB_DB_NAME`).
4. Verify `/health` and `/test-db` on the live Render URL, then run the full smoke checklist.

---

## Self-Review

**Spec coverage:**
- Native `mongodb` driver — Tasks 1, 4, and all rewrites. ✓
- In-place swap, current file layout kept — Tasks 5–14. ✓
- `_id` = existing UUID, original id field kept — Tasks 5, 11, 13. ✓
- Indexes on `messages` — Task 4 (`ensureIndexes`). ✓
- Connection module with `connectDB`/`getDB`/`ensureIndexes` — Task 4. ✓
- Async startup ordering (connect → indexes → cleanup → listen) — Task 14. ✓
- `/test-aws` → `/test-db` — Task 14. ✓
- All 13 files from the spec — Tasks 1 (`package.json`), 3–14. ✓
- `userStatsRoutes.js` drops aws-sdk v2 — Task 8. ✓
- `uuid` declared explicitly — Task 1. ✓
- Chat history sorted by timestamp — Task 11. ✓
- `cleanupService` pagination dropped — Task 9. ✓
- `$inc` replaces `ADD`/`if_not_exists` — Tasks 7, 13. ✓
- `render.yaml` env vars updated — Task 15. ✓
- Manual smoke test + `/test-db` verification — Task 16. ✓
- Extra (discovered): `socket/events.js` ESM→CJS fix — Task 2. Necessary for the "deployable on Render" goal; flagged to the user.

**Placeholder scan:** No TBD/TODO/"add error handling" placeholders — every task contains the complete file content. The only `<userID>` substitution (Task 16, Step 5) is an intentional runtime value documented in place.

**Type/name consistency:** `connectDB` / `getDB` / `ensureIndexes` are defined in Task 4 and used consistently in Tasks 5–14. `getDB().collection('users'|'games'|'messages')` collection names are consistent throughout. `updateGameStatus` (Task 6) is imported and used in Task 13. `cleanupInvalidUsers` (Task 9) is imported in Task 14. `EVENTS` export shape (Task 2) matches all `require('./events')` / `require('../events')` consumers.
