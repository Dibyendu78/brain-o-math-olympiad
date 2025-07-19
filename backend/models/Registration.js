const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  registrationId: {
    type: String,
    required: true,
    unique: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  paymentScreenshot: {
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed','rejected'],
    default: 'pending'
  },
  paymentUploadedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  statusHistory: [{
    status: String,
    changedBy: String,
    reason: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

// Static method to generate registration ID
registrationSchema.statics.generateRegistrationId = function() {
  return 'REG' + Date.now();
};

// Method to update status
registrationSchema.methods.updateStatus = async function(newStatus, adminUsername, reason) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    changedBy: adminUsername,
    reason: reason || '',
    timestamp: new Date()
  });
  return this.save();
};

// Static method for statistics
registrationSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('Registration', registrationSchema);
