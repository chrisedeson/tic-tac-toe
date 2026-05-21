// backend/src/routes/userStatsRoutes.js
const express = require('express');
const { getDB } = require('../config/db');

const router = express.Router();

// Fetch user stats endpoint
router.get('/user/:userId/stats', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await getDB().collection('users').findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { wins, losses, draws } = user;
    return res.json({ wins, losses, draws });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

module.exports = router;
