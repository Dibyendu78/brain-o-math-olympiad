const mongoose = require('mongoose');

// Robust email regex (commonly used for Mongoose validation)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const schoolSchema = new mongoose.Schema({
  schoolName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  schoolAddress: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  coordinatorName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  coordinatorEmail: {
    type: String,
    required: [true, 'coordinatorEmail is required'],
    trim: true,
    lowercase: true,
    match: [emailRegex, 'Invalid email address format'],
    maxlength: 254, // standard max email length
    // optional: you may also want 'unique: true' if email uniqueness is required
  },
  coordinatorPhone: {
    type: String,
    required: [true, 'coordinatorPhone is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Phone must be 10 digits']
  },
  registrationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('School', schoolSchema);
