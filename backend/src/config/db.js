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
