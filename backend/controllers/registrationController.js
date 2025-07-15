// backend/controllers/registrationController.js

const Registration = require('../models/Registration');
const School = require('../models/School');
const Student = require('../models/Student');

exports.submitRegistration = async (req, res) => {
  try {
    // ✅ Do NOT parse again, as JSON has already been parsed by middleware
    const school = req.body.school;
    const students = req.body.students;
    const totalAmount = req.body.totalAmount;

    // ✅ Required checks (after parsing)
    if (!school || !students || !students.length || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Missing required data: school, students, or payment screenshot.'
      });
    }

    // Generate a registrationId (assume the function is defined on Registration model)
    const registrationId = Registration.generateRegistrationId();

    // Save school
    const schoolDoc = await School.create({ ...school, registrationId });

    // Save students in bulk
    // (if you want the operation to continue despite validation errors in some students,
    //  you can use Student.insertMany(students, { ordered: false }) [6], but usually awaits success on all)
    const studentDocs = await Promise.all(
      students.map((s) =>
        Student.create({
          ...s,
          category: Student.calculateCategory(s.class),
          fee: Student.calculateFee(s.subjects),
          registrationId,
        })
      )
    );

    // Save registration entry
    const reg = await Registration.create({
      registrationId,
      school: schoolDoc._id,
      students: studentDocs.map((d) => d._id),
      totalAmount,
      paymentScreenshot: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });

    // Success response
    res.status(201).json({
      success: true,
      data: {
        registrationId: reg.registrationId,
        status: reg.status,
      },
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
        message: 'Registration not found',
      });
    }

    res.json({
      success: true,
      data: reg,
    });
  } catch (e) {
    console.error('❌ Fetch Error:', e.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching registration',
    });
  }
};
