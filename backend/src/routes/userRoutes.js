// backend/src/routes/userRoutes.js
const express = require('express');
const {
  getAllUsers,
  getUserById, // <-- Add this
} = require('../controllers/userController');

const router = express.Router();

router.get('/', getAllUsers);
router.get('/:id', getUserById); // <-- New route for user validation

module.exports = router;
