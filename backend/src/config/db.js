// backend/src/config/db.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const config = require('./index');

const client = new DynamoDBClient({
  region: config.aws.region,
  // credentials can be configured via environment variables or IAM roles on AWS services
});

const docClient = DynamoDBDocumentClient.from(client);

module.exports = { docClient, client };