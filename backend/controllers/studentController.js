const Student = require('../models/Student');
const Registration = require('../models/Registration');
const School = require('../models/School');

// Get all students with pagination and filters, enriched with School/Coordinator Data and Registration Status
exports.getAllStudents = async (req, res) => {
  try {
    const { page = 1, status = '', class: studentClass = '' } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build filter for students
    const matchStage = {};
    if (status) matchStage['status'] = status;
    if (studentClass) matchStage['class'] = studentClass;

    // AGGREGATE: Join students -> registration -> school
    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Join Registration on registrationId (string field)
      {
        $lookup: {
          from: 'registrations',
          localField: 'registrationId',
          foreignField: 'registrationId',
          as: 'reg'
        }
      },
      { $unwind: { path: '$reg', preserveNullAndEmptyArrays: true } },
      // Join School on reg.school (ObjectId)
      {
        $lookup: {
          from: 'schools',
          localField: 'reg.school',
          foreignField: '_id',
          as: 'school'
        }
      },
      { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
      // Compose output
      {
        $project: {
          studentId:1,
          name: 1,
          class: 1,
          category: 1,
          subjects: 1,
          fee: 1,
          parentName: 1,
          parentContact: 1,
          schoolName: '$school.schoolName',
          coordinatorName: '$school.coordinatorName',
          coordinatorEmail: '$school.coordinatorEmail',
          registrationStatus: { $ifNull: ['$reg.status', 'NO_REG_FOUND'] }, // Also available if you want to show both
          paymentStatus: { $ifNull: ['$reg.paymentStatus', 'NO_REG_FOUND'] },
          status: { $ifNull: ['$reg.status', 'NO_REG_FOUND'] },   // <<--- This will **never** be undefined now!
          createdAt: 1
        }
      }
    ];

    const students = await Student.aggregate(pipeline);

    // Total count (for pagination)
    const total = await Student.countDocuments(matchStage);

    res.json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
};

// Update student status (this only changes student-specific status; for admin main status, use registration!)
exports.updateStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const student = await Student.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating student status'
    });
  }
};

// Export students to CSV (enriched, same as paginated fetch)
exports.exportStudents = async (req, res) => {
  try {
    // Enrich all students (no pagination)
    const pipeline = [
      {
        $lookup: {
          from: 'registrations',
          localField: 'registrationId',
          foreignField: 'registrationId',
          as: 'reg'
        }
      },
      { $unwind: { path: '$reg', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'schools',
          localField: 'reg.school',
          foreignField: '_id',
          as: 'school'
        }
      },
      { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          studentId: 1,
          name: 1,
          class: 1,
          category: 1,
          subjects: 1,
          fee: 1,
          parentName: 1,
          parentContact: 1,
          schoolName: '$school.schoolName',
          coordinatorName: '$school.coordinatorName',
          coordinatorEmail: '$school.coordinatorEmail',
          registrationStatus: { $ifNull: ['$reg.status', 'NO_REG_FOUND'] },
          paymentStatus: { $ifNull: ['$reg.paymentStatus', 'NO_REG_FOUND'] },
          status: { $ifNull: ['$reg.status', 'NO_REG_FOUND'] },
          createdAt: 1
        }
      }
    ];
    const students = await Student.aggregate(pipeline);

    // CSV
    const headers = [
      'Student ID',
      'Name',
      'Class',
      'Category',
      'Subjects',
      'Fee',
      'Parent Name',
      'Parent Contact',
      'School Name',
      'Coordinator Name',
      'Coordinator Email',
      'Registration Status',
      'Payment Status',
      'Student Status',
      'Created At'
    ];

    // CSV data
    const csvData = students.map(s => [
      s.studentId,
      s.name,
      s.class,
      s.category,
      s.subjects,
      s.fee,
      s.parentName || '',
      s.parentContact || '',
      s.schoolName || '',
      s.coordinatorName || '',
      s.coordinatorEmail || '',
      s.registrationStatus || '',
      s.paymentStatus || '',
      s.status || '',
      s.createdAt
    ]);

    // Create CSV content
    const csvContent = [
      headers,
      ...csvData
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting students'
    });
  }
};

// Get student statistics (no change needed)
exports.getStudentStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const pendingStudents = await Student.countDocuments({ status: 'pending' });
    const verifiedStudents = await Student.countDocuments({ status: 'verified' });
    const rejectedStudents = await Student.countDocuments({ status: 'rejected' });

    res.json({
      success: true,
      data: {
        total: totalStudents,
        pending: pendingStudents,
        verified: verifiedStudents,
        rejected: rejectedStudents
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student statistics'
    });
  }
};
