const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const coordinatorController = require('../controllers/coordinatorController');
const { authenticateCoordinator } = require('../middleware/coordinatorAuth');

// Multer for screenshot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// -- PUBLIC ROUTES --
router.post('/signup', coordinatorController.signupCoordinator);
router.post('/login', coordinatorController.coordinatorLogin);

// Middleware: all routes below are PROTECTED (require login)
router.use(authenticateCoordinator);

// REGISTRATION DASHBOARD
router.get('/registration', coordinatorController.getRegistration);

// STUDENT CRUD
router.post('/students', coordinatorController.addStudent);
router.put('/students/:index', coordinatorController.updateStudent);
router.delete('/students/:index', coordinatorController.removeStudent);

// PAYMENT
router.post('/payment', upload.single('paymentScreenshot'), coordinatorController.uploadPayment);

module.exports = router;
