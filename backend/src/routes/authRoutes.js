// backend/src/routes/authRoutes.js
const express = require('express');
const { registerOrLoginUser } = require('../controllers/authController');
const router = express.Router();

router.post('/register', registerOrLoginUser); // Handles both new user and returning user by name

module.exports = router;