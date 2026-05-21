// backend/src/services/cleanupService.js
const { getDB } = require('../config/db');

/**
 * Deletes any users document whose username is missing, null, non-string,
 * empty, or whitespace-only.
 */
async function cleanupInvalidUsers() {
  console.log('[Cleanup] Starting invalid user cleanup');

  const result = await getDB()
    .collection('users')
    .deleteMany({
      $or: [
        { username: { $not: { $type: 'string' } } }, // missing, null, or non-string
        { username: { $regex: /^\s*$/ } }, // empty or whitespace-only string
      ],
    });

  console.log(
    `[Cleanup] Completed invalid user cleanup, removed ${result.deletedCount}`
  );
}

module.exports = { cleanupInvalidUsers };
