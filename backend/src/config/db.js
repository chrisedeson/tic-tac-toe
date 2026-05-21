// backend/src/config/db.js
const { MongoClient } = require('mongodb');
const config = require('./index');

let client = null;
let db = null;
let connectPromise = null;

/**
 * Connects to MongoDB once and caches the database handle.
 * Safe to call multiple times and concurrently — a single connection attempt
 * is shared by all callers. The client/db are assigned only on success, and a
 * failed attempt is cleared so a later call can retry.
 */
async function connectDB() {
  if (db) return db;
  if (!connectPromise) {
    connectPromise = (async () => {
      if (!config.mongodb.uri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      const newClient = new MongoClient(config.mongodb.uri);
      await newClient.connect();
      client = newClient;
      db = client.db(config.mongodb.dbName);
      console.log(`✅ Connected to MongoDB database "${config.mongodb.dbName}"`);
      return db;
    })().catch((err) => {
      connectPromise = null;
      throw err;
    });
  }
  return connectPromise;
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
