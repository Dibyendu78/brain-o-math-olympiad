// backend/controllers/registrationController.js

const Registration = require('../models/Registration');
const School = require('../models/School');
const Student = require('../models/Student');
const {
  sendRegistrationAcknowledgementEmail
} = require('../utils/mailer');

exports.submitRegistration = async (req, res) => {
  try {
    const { school, students, totalAmount } = req.body;

    if (!school || !students || !students.length || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing school, students, or payment screenshot.'
      });
    }

    const registrationId = Registration.generateRegistrationId();

    // Save school record
    const schoolDoc = await School.create({ ...school, registrationId });

    // Save student records
    const studentDocs = await Promise.all(
      students.map((s) =>
        Student.create({
          ...s,
          category: Student.calculateCategory(s.class),
          fee: Student.calculateFee(s.subjects),
          registrationId
        })
      )
    );

    // Save registration data
    const reg = await Registration.create({
      registrationId,
      school: schoolDoc._id,
      students: studentDocs.map((s) => s._id),
      totalAmount,
      paymentScreenshot: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

    // ✅ Send acknowledgement email
    await sendRegistrationAcknowledgementEmail({
      coordinatorEmail: schoolDoc.coordinatorEmail,
      coordinatorName: schoolDoc.coordinatorName,
      schoolName: schoolDoc.schoolName,
      contact: `${schoolDoc.coordinatorPhone} / ${schoolDoc.coordinatorEmail}`,
      studentCount: studentDocs.length,
      submittedAt: reg.submittedAt || new Date()
    });

    // ✅ Success response
    return res.status(201).json({
      success: true,
      data: {
        registrationId: reg.registrationId,
        status: reg.status
      }
    });

  } catch (e) {
    console.error('❌ Registration Error:', e.message);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: e.message
    });
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const reg = await Registration.findOne({ registrationId: req.params.id })
      .populate('school')
      .populate('students');

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      data: reg
    });
  } catch (e) {
    console.error('❌ Fetch Error:', e.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching registration'
    });
  }
};
