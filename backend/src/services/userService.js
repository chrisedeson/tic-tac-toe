// backend/src/services/userService.js
const { docClient } = require('../config/db');
const config = require('../config');
const { UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

exports.updateUserStats = async (userId, result) => {
    if (userId === 'christopher' || !userId) return null;

    const key = result === 'wins' ? 'wins' : result === 'losses' ? 'losses' : 'draws';

    const params = {
        TableName: config.aws.usersTable,
        Key: { userID: userId },
        UpdateExpression: 'ADD #statKey :val',
        ExpressionAttributeNames: { '#statKey': key },
        ExpressionAttributeValues: { ':val': 1 },
        ReturnValues: 'UPDATED_NEW',
    };
    try {
        const { Attributes } = await docClient.send(new UpdateCommand(params));
        return Attributes;
    } catch (error) {
        console.error(`Failed to update stats for user ${userId}:`, error);
        return null;
    }
};

exports.getUserProfile = async (userId) => {
    const params = {
        TableName: config.aws.usersTable,
        Key: { userID: userId },
    };
    try {
        const { Item } = await docClient.send(new GetCommand(params));
        return Item;
    } catch (error) {
        console.error(`Failed to get user profile for ${userId}:`, error);
        return null;
    }
};