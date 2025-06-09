// backend/src/routes/userRoutes.js
const express = require('express');
const {
  getAllUsers,
  getUserById,
  startGame,
  endGame,
  updatePresence,
} = require('../controllers/userController');

const router = express.Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById);

// Game status routes
router.post('/user/:userId/startGame', startGame);
router.post('/user/:userId/endGame', endGame);

// Presence update route
router.post('/:userId/presence', updatePresence);

module.exports = router;
