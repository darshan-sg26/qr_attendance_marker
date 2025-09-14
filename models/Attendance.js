const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  faceVerified: {
    type: Boolean,
    default: false
  },
  verificationTime: {
    type: Number, // Time taken for face verification in seconds
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  }
});

// Index for better query performance
attendanceSchema.index({ studentId: 1, sessionId: 1 });
attendanceSchema.index({ timestamp: -1 });
attendanceSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
