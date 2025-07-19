const School = require('../models/School');
const Registration = require('../models/Registration');
const Student = require('../models/Student');
const jwt = require('jsonwebtoken');
const { sendCoordinatorWelcomeEmail } = require('../utils/mailer');

// Helper
function generateRegistrationId() {
  return 'REG' + Date.now();
}
function calculateFee(subjects) {
  return subjects === 'both' ? 140 : 70;
}
function calculateCategory(cls) {
  const c = parseInt(cls, 10);
  if (c >= 3 && c <= 4) return 'A';
  if (c >= 5 && c <= 6) return 'B';
  if (c >= 7 && c <= 8) return 'C';
  if (c >= 9 && c <= 10) return 'D';
  if (c >= 11) return 'E';
  return '-';
}

// ----------------SIGNUP------------------
const signupCoordinator = async (req, res) => {
  try {
    const {
      schoolName,
      schoolAddress,
      coordinatorName,
      coordinatorEmail,
      coordinatorPhone
    } = req.body;
    if (!schoolName || !schoolAddress || !coordinatorName || !coordinatorEmail || !coordinatorPhone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const exists = await School.findOne({ coordinatorEmail });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered!' });
    }
    const registrationId = generateRegistrationId();
    const coordinatorPassword = coordinatorPhone.slice(-4);
    await School.create({
      schoolName,
      schoolAddress,
      coordinatorName,
      coordinatorEmail,
      coordinatorPhone,
      coordinatorPassword,
      registrationId
    });
    await sendCoordinatorWelcomeEmail({
      coordinatorName,
      coordinatorEmail,
      coordinatorPhone
    });
    res.status(201).json({
      success: true,
      message: 'Coordinator registered successfully. Credentials sent via email.'
    });
  } catch (error) {
    console.error('❌ Signup Error:', error.message);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
};

// ----------------LOGIN------------------
const coordinatorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
    if (!/^\d{4}$/.test(password)) return res.status(400).json({ success: false, message: 'Password must be exactly 4 digits' });

    const school = await School.findOne({ coordinatorEmail: email });
    if (!school) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (school.coordinatorPassword !== password) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      {
        schoolId: school._id,
        coordinatorEmail: school.coordinatorEmail,
        coordinatorName: school.coordinatorName,
        schoolName: school.schoolName
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      coordinator: {
        coordinatorName: school.coordinatorName,
        coordinatorEmail: school.coordinatorEmail,
        schoolName: school.schoolName,
        coordinatorPhone: school.coordinatorPhone
      }
    });
  } catch (error) {
    console.error('❌ Coordinator Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// ----- DASHBOARD: GET REGISTRATION DATA -----
const getRegistration = async (req, res) => {
  try {
    const schoolId = req.coordinator.schoolId;
    let registration = await Registration.findOne({ school: schoolId })
      .populate('students');
    if (!registration) {
      registration = await Registration.create({
        registrationId: generateRegistrationId(),
        school: schoolId,
        students: [],
        totalAmount: 0,
        paymentStatus: 'pending',
        status: 'pending'
      });
    }
    // Re-populate students after create (might be empty array)
    registration = await Registration.findById(registration._id).populate('students');
    res.json({ success: true, data: registration });
  } catch (error) {
    console.error('❌ Get Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching registration data' });
  }
};

// ---- ADD STUDENT ----
// ---- ADD STUDENT ----
const addStudent = async (req, res) => {
  try {
    const schoolId = req.coordinator.schoolId;
    const { name, class: studentClass, subjects, parentName, parentContact } = req.body;
    if (!name || !studentClass || !subjects) {
      return res.status(400).json({ success: false, message: 'Name, class, and subjects are required' });
    }

    // Generate next studentId
    const lastStudent = await Student.findOne({}).sort({ studentId: -1 }).lean();
    let next = 1;
    if (lastStudent && lastStudent.studentId) {
      next = parseInt(lastStudent.studentId.replace('BOMO', '')) + 1;
    }
    const studentId = 'BOMO' + String(next).padStart(6, '0');

    // Find or create registration for the school
    let registration = await Registration.findOne({ school: schoolId });
    if (!registration) {
      registration = await Registration.create({
        registrationId: generateRegistrationId(),
        school: schoolId,
        students: [],
        totalAmount: 0,
        paymentStatus: 'pending',
        status: 'pending'
      });
    }

    // Create the student WITH studentId
    const studentObj = await Student.create({
      studentId, // <-- this is crucial
      name,
      class: studentClass,
      category: calculateCategory(studentClass),
      subjects,
      fee: calculateFee(subjects),
      parentName,
      parentContact,
      registrationId: registration.registrationId
    });
    registration.students.push(studentObj._id);
    registration.totalAmount += studentObj.fee;
    await registration.save();
    res.json({ success: true, message: 'Student added successfully', data: studentObj });
  } catch (error) {
    console.error('❌ Add Student Error:', error);
    res.status(500).json({ success: false, message: 'Server error adding student' });
  }
};


// ---- UPDATE STUDENT ----
const updateStudent = async (req, res) => {
  try {
    const schoolId = req.coordinator.schoolId;
    const studentIndex = parseInt(req.params.index);
    const { name, class: studentClass, subjects, parentName, parentContact } = req.body;
    let registration = await Registration.findOne({ school: schoolId }).populate('students');
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (registration.paymentStatus === 'completed') return res.status(400).json({ success: false, message: 'Cannot edit students after payment' });
    if (studentIndex >= registration.students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const student = registration.students[studentIndex];
    const oldFee = student.fee;
    student.name = name;
    student.class = studentClass;
    student.category = calculateCategory(studentClass);
    student.subjects = subjects;
    student.fee = calculateFee(subjects);
    student.parentName = parentName;
    student.parentContact = parentContact;
    await student.save();

    registration.totalAmount = registration.totalAmount - oldFee + student.fee;
    await registration.save();

    res.json({ success: true, message: 'Student updated successfully', data: student });
  } catch (error) {
    console.error('❌ Update Student Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating student' });
  }
};

// ---- REMOVE STUDENT ----
const removeStudent = async (req, res) => {
  try {
    const schoolId = req.coordinator.schoolId;
    const studentIndex = parseInt(req.params.index);
    let registration = await Registration.findOne({ school: schoolId }).populate('students');
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (registration.paymentStatus === 'completed') return res.status(400).json({ success: false, message: 'Cannot remove students after payment' });
    if (studentIndex >= registration.students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const student = registration.students[studentIndex];
    registration.students.splice(studentIndex, 1);
    registration.totalAmount -= student.fee;
    await registration.save();
    await Student.findByIdAndDelete(student._id);
    res.json({ success: true, message: 'Student removed successfully' });
  } catch (error) {
    console.error('❌ Remove Student Error:', error);
    res.status(500).json({ success: false, message: 'Server error removing student' });
  }
};

// ---- UPLOAD PAYMENT ----
const uploadPayment = async (req, res) => {
  try {
    const schoolId = req.coordinator.schoolId;
    if (!req.file) return res.status(400).json({ success: false, message: 'Payment screenshot required' });
    const registration = await Registration.findOne({ school: schoolId });
    if (!registration) return res.status(404).json({ success: false, message: 'No registration found for this school' });
    if (registration.students.length === 0) return res.status(400).json({ success: false, message: 'Add at least one student before uploading payment' });

    registration.paymentScreenshot = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    };
    registration.paymentStatus = 'completed';
    registration.paymentUploadedAt = new Date();
    await registration.save();

    res.json({ success: true, message: 'Payment screenshot uploaded successfully', data: registration });
  } catch (error) {
    console.error('❌ Upload Payment Error:', error);
    res.status(500).json({ success: false, message: 'Server error uploading payment' });
  }
};

module.exports = {
  signupCoordinator,
  coordinatorLogin,
  getRegistration,
  addStudent,
  updateStudent,
  removeStudent,
  uploadPayment
};
