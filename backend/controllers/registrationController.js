// backend/controllers/registrationController.js

const Registration = require('../models/Registration');
const School = require('../models/School');
const Student = require('../models/Student');
const { sendRegistrationAcknowledgementEmail } = require('../utils/mailer');

exports.submitRegistration = async (req, res) => {
  try {
    const { school, students, totalAmount } = req.body;

    // Input validation
    if (!school || !students || !students.length || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing school, students, or payment screenshot.'
      });
    }

    const registrationId = Registration.generateRegistrationId();

    // Save school record (or use existing if you want unique schools)
    const schoolDoc = await School.create({ ...school, registrationId });

    // Find last used studentId (for custom student numbering)
    const lastStudent = await Student.findOne({}).sort({ studentId: -1 }).lean();
    let nextNumber = 1;
    if (lastStudent && lastStudent.studentId) {
      nextNumber = parseInt(lastStudent.studentId.replace('BOMO', '')) + 1;
    }

    // Save student records
    const studentDocs = [];
    for (const s of students) {
      const newStudentId = 'BOMO' + String(nextNumber).padStart(6, '0');
      nextNumber++;

      const studentDoc = await Student.create({
        studentId: newStudentId,
        name: s.name,
        class: s.class,
        category: Student.calculateCategory(s.class),
        subjects: s.subjects,
        fee: Student.calculateFee(s.subjects),
        parentName: s.parentName,
        parentContact: s.parentContact,
        registrationId: registrationId,
        // Convenience fields
        schoolName: schoolDoc.schoolName,
        coordinatorName: schoolDoc.coordinatorName,
        coordinatorEmail: schoolDoc.coordinatorEmail,
        status: 'pending'
      });

      studentDocs.push(studentDoc);
    }

    // Save registration (with student ObjectIds)
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
      },
      // status: 'pending' (should default to 'pending' in model)
    });

    // Send acknowledgement email
    try {
      await sendRegistrationAcknowledgementEmail({
        coordinatorEmail: schoolDoc.coordinatorEmail,
        coordinatorName: schoolDoc.coordinatorName,
        schoolName: schoolDoc.schoolName,
        contact: `${schoolDoc.coordinatorPhone} / ${schoolDoc.coordinatorEmail}`,
        registrationId: reg.registrationId,
        studentCount: studentDocs.length,
        submittedAt: reg.submittedAt || new Date()
      });
    } catch (mailErr) {
      // Log but do not fail the registration
      console.error('❌ Registration acknowledgement email error:', mailErr.message);
    }

    // Respond to client
    return res.status(201).json({
      success: true,
      data: {
        registrationId: reg.registrationId,
        status: reg.status
      }
    });

  } catch (e) {
    console.error('❌ Registration Error:', e);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: e.message || e.toString()
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
    console.error('❌ Fetch Error:', e);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching registration'
    });
  }
};
