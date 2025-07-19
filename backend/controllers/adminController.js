// backend/controllers/adminController.js

const Registration = require('../models/Registration');
const Student = require('../models/Student');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { sendStatusUpdateEmail } = require('../utils/mailer');
exports.login = async function (req, res) {
  // Example dummy login (replace with your logic)
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    // Issue token, do real authentication in production!
    res.json({success: true, token: "dummy-token"});
  } else {
    res.status(401).json({success: false, message: "Invalid credentials"});
  }
};

// Get paginated registrations (with optional status filter)
exports.listRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const q = status && status !== '' ? { status: new RegExp(`^${status}$`, 'i') } : {};


    const skip = (page - 1) * limit;

    const data = await Registration.find(q)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(+limit)
      .populate('school')
      .populate('students');

    const total = await Registration.countDocuments(q);

    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total }
    });
  } catch (err) {
    console.error('❌ Fetch Registrations Error:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching registrations' });
  }
};

// Update registration status and send email
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const { id } = req.params;

    const allowed = ['pending', 'verified', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    // Find the registration by registrationId
    const reg = await Registration.findOne({ registrationId: id })
      .populate('school')
      .populate('students');
    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // History tracking
    reg.statusHistory.push({
      status,
      changedBy: req.admin?.username || "Admin",
      reason: reason || "",
      timestamp: new Date()
    });

    // Set status and adjust paymentStatus as per business logic
    reg.status = status;

    if (status === 'verified') {
      reg.paymentStatus = 'completed';
    } else if (status === 'pending') {
      reg.paymentStatus = 'pending';
    } else if (status === 'rejected') {
      // Do NOT set paymentStatus to 'Rejected' (causes schema error)
      reg.paymentStatus = 'pending'; // or leave as-is, or add 'rejected' to schema enum if you really want!
    }

    await reg.save();

    const {
      coordinatorEmail,
      coordinatorName,
      coordinatorPhone,
      schoolName
    } = reg.school;

    // Send email for status change (if desired)
    if (['verified', 'rejected'].includes(status)) {
      await sendStatusUpdateEmail({
        registrationId: id,
        status,
        coordinatorEmail,
        coordinatorName,
        coordinatorPhone,
        schoolName,
        students: reg.students
      });
    }

    return res.json({ success: true, message: 'Status updated and email sent', data: reg });
  } catch (err) {
    console.error('❌ Update Status Error:', err);
    res.status(500).json({ success: false, message: 'Could not update status', error: err.message });
  }
};

// Export all registrations as CSV
exports.exportRegistrations = async (_, res) => {
  try {
    const regs = await Registration.find()
      .populate('school')
      .populate('students');

    const rows = regs.flatMap(reg =>
      reg.students.map(s => ({
        RegistrationID: reg.registrationId,
        SchoolName: reg.school.schoolName,
        Coordinator: reg.school.coordinatorName,
        StudentName: s.name,
        Class: s.class,
        Category: s.category,
        Subjects: Array.isArray(s.subjects) ? s.subjects.join(', ') : s.subjects,
        Fee: s.fee,
        Total: reg.totalAmount,
        Status: reg.status
      }))
    );

    const csv = new Parser().parse(rows);
    const filePath = path.join(__dirname, '../uploads', 'registrations.csv');
    fs.writeFileSync(filePath, csv);

    res.download(filePath, 'registrations.csv', () => {
      fs.unlinkSync(filePath); // Clean up temp file
    });
  } catch (err) {
    console.error('❌ Export Error:', err.message);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

// DASHBOARD STATISTICS (total registrations, students, revenue)
exports.getStats = async (req, res) => {
  try {
    const totalRegistrations = await Registration.countDocuments();
    const totalStudents = await Student.countDocuments();
    // Calculate total revenue from registration documents
    const registrations = await Registration.find({});
    const totalRevenue = registrations.reduce((sum, reg) => sum + (reg.totalAmount || 0), 0);

    res.json({
      success: true,
      data: {
        totalRegistrations,
        totalStudents,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stats'
    });
  }
};

// --- (Optional: Remove getStatistics if unused, as getStats replaces it) ---

/*
// Get dashboard statistics (using static method in model - only if you still use it elsewhere)
exports.getStatistics = async (_, res) => {
  try {
    const stats = await Registration.getStatistics(); // Requires static method in model
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('❌ Stats Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};
*/
