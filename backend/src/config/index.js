// backend/src/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Recommended to use IAM roles for EC2/Lambda
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Recommended to use IAM roles
    usersTable: process.env.DYNAMODB_USERS_TABLE || 'users',
    gamesTable: process.env.DYNAMODB_GAMES_TABLE || 'games',
    messagesTable: process.env.DYNAMODB_MESSAGES_TABLE || 'messages',
  },
  corsOptions: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Adjust for your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }
};