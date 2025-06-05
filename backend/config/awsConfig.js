const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  region: 'us-east-1', // or your AWS region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,  // We'll load these from .env
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports = dynamoDB;
