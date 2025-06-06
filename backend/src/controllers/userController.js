// backend/src/controllers/userController.js
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/db');
const config = require('../config');

exports.getAllUsers = async (req, res) => {
    try {
        const params = {
            TableName: config.aws.usersTable,
            // You can add a ProjectionExpression to only get needed fields
            // ProjectionExpression: "id, username, #status, lastSeen",
            // ExpressionAttributeNames: { "#status": "status" }
        };
        const { Items } = await docClient.send(new ScanCommand(params));
        res.status(200).json(Items || []);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};