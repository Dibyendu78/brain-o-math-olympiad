// backend/controllers/adminController.js

const Registration = require('../models/Registration');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { sendStatusUpdateEmail } = require('../utils/mailer');

// Get paginated registrations (with optional status filter)
exports.listRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const q = status ? { status } : {};
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update registration status with optional reason


exports.updateRegistrationStatus = async (req, res) => {
  try {
    const reg = await Registration.findOne({ registrationId: req.params.id })
      .populate('school');

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    await reg.updateStatus(req.body.status, req.admin.username, req.body.reason);

    // ✅ Send email to coordinator
    const { coordinatorEmail, coordinatorName } = reg.school;

    await sendStatusUpdateEmail({
      to: coordinatorEmail,
      name: coordinatorName,
      status: req.body.status,
      registrationId: req.params.id,
      reason: req.body.reason || null
    });

    res.json({ success: true, message: 'Status updated, email sent', data: reg });
  } catch (err) {
    console.error('❌ Update Status Error:', err.message);
    res.status(500).json({ success: false, message: 'Could not update status' });
  }
};


// Export all registrations to CSV
exports.exportRegistrations = async (_, res) => {
  const regs = await Registration.find().populate('school').populate('students');

  const rows = regs.flatMap(reg =>
    reg.students.map(s => ({
      RegistrationID: reg.registrationId,
      SchoolName: reg.school.schoolName,
      StudentName: s.name,
      Class: s.class,
      Category: s.category,
      Subjects: s.subjects,
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
};

// Get dashboard statistics
exports.getStatistics = async (_, res) => {
  try {
    const stats = await Registration.getStatistics(); // Assumes static method defined on model
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('❌ Stats Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};
