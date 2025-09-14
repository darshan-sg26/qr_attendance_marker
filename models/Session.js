const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  teacherId: {
    type: String,
    required: true
  },
  sessionName: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  presentStudents: {
    type: Number,
    default: 0
  },
  settings: {
    faceVerificationRequired: {
      type: Boolean,
      default: true
    },
    verificationTimeout: {
      type: Number,
      default: 10 // seconds
    },
    allowMultipleAttendance: {
      type: Boolean,
      default: false
    }
  }
});

// Index for better query performance
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);
