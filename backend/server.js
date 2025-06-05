// Import required modules from AWS SDK v3
const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const app = express();

// Initialize DynamoDB client (v3)
const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });

// Basic middleware for JSON parsing
app.use(express.json());

// Define the /test-aws route
app.get('/test-aws', async (req, res) => {
  try {
    // Define parameters for DynamoDB scan
    const params = {
      TableName: 'users', // Ensure this matches your DynamoDB table name
    };

    // Scan the DynamoDB table using v3
    const command = new ScanCommand(params);
    const data = await dynamoDBClient.send(command);

    if (!data.Items || data.Items.length === 0) {
      return res.status(404).json({ message: 'No data found in DynamoDB' });
    }

    res.json({
      message: 'AWS DynamoDB is working',
      data: data.Items, // This will be the data from your DynamoDB table
    });
  } catch (error) {
    console.error('Error accessing DynamoDB:', error);
    res.status(500).json({ error: 'Failed to connect to DynamoDB' });
  }
});

// Server listening on port
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
