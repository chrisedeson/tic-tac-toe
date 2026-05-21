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
