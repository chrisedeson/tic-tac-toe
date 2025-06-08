// backend/src/routes/userRoutes.js
const express = require('express');
const {
  getAllUsers,
  getUserById, // <-- Add this
  startGame,  // <-- Import the new startGame controller
  endGame,    // <-- Import the new endGame controller
} = require('../controllers/userController');

const router = express.Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById); // <-- New route for user validation

// Add new routes for starting and ending games
router.post('/user/:userId/startGame', startGame);  // Starts the game (sets gameStatus to 'playing')
router.post('/user/:userId/endGame', endGame);      // Ends the game (sets gameStatus to 'offline')

module.exports = router;
