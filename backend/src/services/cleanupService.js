// backend/src/services/cleanupService.js
const { docClient } = require("../config/db");
const config = require("../config");
const { ScanCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

/**
 * Scans the users table and deletes any item where username is missing or falsy.
 */
async function cleanupInvalidUsers() {
  console.log("[Cleanup] Starting invalid user cleanup");

  const params = {
    TableName: config.aws.usersTable,
    ProjectionExpression: "userID, username",
  };
  let items = [];
  let lastKey;

  // Paginate through the whole table
  do {
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const data = await docClient.send(new ScanCommand(params));
    items = items.concat(data.Items || []);
    lastKey = data.LastEvaluatedKey;
  } while (lastKey);

  // Delete any with invalid username
  for (const item of items) {
    if (
      !item.username ||
      typeof item.username !== "string" ||
      item.username.trim() === ""
    ) {
      console.log(
        `[Cleanup] Deleting userID=${item.userID} with invalid username`
      );
      await docClient.send(
        new DeleteCommand({
          TableName: config.aws.usersTable,
          Key: { userID: item.userID },
        })
      );
    }
  }

  console.log("[Cleanup] Completed invalid user cleanup");
}

module.exports = { cleanupInvalidUsers };
