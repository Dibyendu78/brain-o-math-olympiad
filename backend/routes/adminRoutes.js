const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const studentController = require('../controllers/studentController');
const { authenticateAdmin, adminLogin } = require('../middleware/auth');

// Admin login
router.post('/login', adminLogin);

// Protected admin routes
router.use(authenticateAdmin);

// Dashboard stats
router.get('/stats', adminController.getStats);

// Registration management
router.get('/registrations', adminController.listRegistrations);
router.put('/registrations/:id/status', adminController.updateRegistrationStatus);
router.get('/export', adminController.exportRegistrations);

// Student management
router.get('/students', studentController.getAllStudents);
router.put('/students/:id/status', studentController.updateStudentStatus);
router.get('/export-students', studentController.exportStudents);
router.get('/student-stats', studentController.getStudentStats);

module.exports = router;
