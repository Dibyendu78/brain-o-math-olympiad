// backend/routes/registrationRoutes.js

const express = require('express');
const router = express.Router();

// Import multer config
const { upload, handleMulterError } = require('../config/multer');

// Import controller functions
const {
  submitRegistration,
  getRegistrationById
} = require('../controllers/registrationController');

// Import validation middleware
const { validateRegistration } = require('../middleware/validation');

// POST: Submit registration with file upload, validation, and controller
router.post(
  '/',
  upload.single('paymentScreenshot'),
  handleMulterError,
  validateRegistration, // ✅ Now includes JSON parsing too
  submitRegistration
);

// GET: Fetch registration by ID
router.get('/:id', getRegistrationById);

module.exports = router;
