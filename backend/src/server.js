// backend/src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const userRoutes = require('./routes/userRoutes');
const { docClient } = require('./config/db');
const { ScanCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const setupSocketHandlers = require('./socket');

// Routes
const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes'); // To be created
// const gameRoutes = require('./routes/gameRoutes'); // To be created

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: config.corsOptions,
});

// Basic Middleware
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/games', gameRoutes);

// Initial Test Route (can be moved or removed later)
app.get('/test-aws', async (req, res) => {
  try {
    const params = { TableName: config.aws.usersTable };
    const command = new ScanCommand(params);
    const data = await docClient.send(command);
    if (!data.Items || data.Items.length === 0) {
      return res.status(404).json({ message: 'No data found in DynamoDB' });
    }
    res.json({ message: 'AWS DynamoDB is working', data: data.Items });
  } catch (error) {
    console.error('Error accessing DynamoDB:', error);
    res.status(500).json({ error: 'Failed to connect to DynamoDB' });
  }
});

// Setup Socket.io
setupSocketHandlers(io);

// Global Error Handler (simple example)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something broke!' });
});

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Socket.io listening on port ${config.port}`);
});

module.exports = { app, server, io }; // Export for potential testing