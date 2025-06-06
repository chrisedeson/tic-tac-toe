const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
// const gameRoutes = require('./routes/gameRoutes'); // TODO: Add when ready

const { docClient } = require('./config/db');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const setupSocketHandlers = require('./socket');

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
// app.use('/api/games', gameRoutes); // Future addition

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Test DynamoDB connection
app.get('/test-aws', async (req, res) => {
  try {
    const data = await docClient.send(new ScanCommand({ TableName: config.aws.usersTable }));
    if (!data.Items || data.Items.length === 0) {
      return res.status(404).json({ message: 'No data found in DynamoDB' });
    }
    res.json({ message: 'AWS DynamoDB is working', data: data.Items });
  } catch (error) {
    console.error('Error accessing DynamoDB:', error);
    res.status(500).json({ error: 'Failed to connect to DynamoDB' });
  }
});

// Initialize socket handlers
setupSocketHandlers(io);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

// Start server
server.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`🔌 Socket.IO active on port ${config.port}`);
});

module.exports = { app, server, io };
