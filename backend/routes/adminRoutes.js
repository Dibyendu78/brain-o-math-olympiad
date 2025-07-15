// backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { authenticateAdmin, adminLogin } = require('../middleware/auth');
const { validateAdminLogin, validateStatusUpdate } = require('../middleware/validation');

// Public login route
router.post('/login', validateAdminLogin, adminLogin);

// All routes below require admin authentication ✅
router.use(authenticateAdmin);

// Protected admin API endpoints
router.get('/registrations', ctrl.listRegistrations);
router.put('/registrations/:id/status', validateStatusUpdate, ctrl.updateRegistrationStatus);
router.get('/export', ctrl.exportRegistrations);
router.get('/stats', ctrl.getStatistics);

module.exports = router;
