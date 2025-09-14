const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
require('dotenv').config();

// Import models
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Session = require('./models/Session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://darshansg46_db_user:GLoQUptW8mD8qtlQ@qrattendance.3oj53bl.mongodb.net/?retryWrites=true&w=majority&appName=qrattendance';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Security features
let failedAttempts = new Map();
let blockedIPs = new Set();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

let requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
}

function isRateLimited(ip) {
  const now = Date.now();
  const clientData = requestCounts.get(ip);
  
  if (!clientData) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (now > clientData.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  clientData.count++;
  return false;
}

function isBlocked(ip) {
  if (blockedIPs.has(ip)) {
    const blockTime = failedAttempts.get(ip + '_blockTime');
    if (blockTime && Date.now() - blockTime > BLOCK_DURATION) {
      blockedIPs.delete(ip);
      failedAttempts.delete(ip + '_blockTime');
      failedAttempts.delete(ip);
      return false;
    }
    return true;
  }
  return false;
}

function recordFailedAttempt(ip) {
  const count = (failedAttempts.get(ip) || 0) + 1;
  failedAttempts.set(ip, count);
  
  if (count >= MAX_FAILED_ATTEMPTS) {
    blockedIPs.add(ip);
    failedAttempts.set(ip + '_blockTime', Date.now());
  }
}

// Apply security middleware
app.use((req, res, next) => {
  const ip = getClientIP(req);
  
  if (isBlocked(ip)) {
    return res.status(429).json({ error: 'IP blocked due to suspicious activity' });
  }
  
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  req.clientIP = ip;
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher-cloud.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student-cloud.html'));
});

// API Routes
app.post('/api/students', async (req, res) => {
  try {
    const { name, studentId, email } = req.body;
    
    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [{ studentId }, { email }]
    });
    
    if (existingStudent) {
      return res.status(400).json({ 
        error: 'Student with this ID or email already exists' 
      });
    }
    
    const student = new Student({
      name,
      studentId,
      email
    });
    
    await student.save();
    res.json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({ isActive: true }).sort({ registeredAt: -1 });
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/qr/generate', async (req, res) => {
  try {
    const { teacherId, sessionName } = req.body;
    const sessionId = uuidv4();
    const qrCode = uuidv4();
    
    // Deactivate any existing active sessions
    await Session.updateMany({ isActive: true }, { isActive: false, endedAt: new Date() });
    
    // Create new session
    const session = new Session({
      sessionId,
      teacherId,
      sessionName,
      qrCode,
      isActive: true
    });
    
    await session.save();
    
    // Generate QR code image
    const qrCodeDataURL = await QRCode.toDataURL(qrCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Notify all students that QR is active
    io.emit('qrActive', { sessionId, qrCode, sessionName });
    
    res.json({ 
      sessionId, 
      qrCode, 
      qrCodeDataURL,
      session 
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/qr/deactivate', async (req, res) => {
  try {
    await Session.updateMany({ isActive: true }, { 
      isActive: false, 
      endedAt: new Date() 
    });
    
    io.emit('qrInactive');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating QR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/qr/status', async (req, res) => {
  try {
    const activeSession = await Session.findOne({ isActive: true });
    
    if (activeSession) {
      const qrCodeDataURL = await QRCode.toDataURL(activeSession.qrCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      res.json({ 
        isActive: true, 
        session: activeSession,
        qrCodeDataURL
      });
    } else {
      res.json({ isActive: false, session: null });
    }
  } catch (error) {
    console.error('Error checking QR status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/attendance/mark', async (req, res) => {
  try {
    const { studentId, qrCode, deviceId, faceVerified, verificationTime } = req.body;
    const ipAddress = req.clientIP;
    
    // Security checks
    if (!studentId || !qrCode || !deviceId) {
      recordFailedAttempt(ipAddress);
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if QR session is active
    const activeSession = await Session.findOne({ 
      qrCode, 
      isActive: true 
    });
    
    if (!activeSession) {
      recordFailedAttempt(ipAddress);
      return res.status(400).json({ error: 'QR code is not active or invalid' });
    }
    
    // Find student
    const student = await Student.findById(studentId);
    if (!student) {
      recordFailedAttempt(ipAddress);
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Check device binding
    if (student.deviceId && student.deviceId !== deviceId) {
      recordFailedAttempt(ipAddress);
      return res.status(400).json({ 
        error: 'Device already registered to another student' 
      });
    }
    
    // Check if already marked attendance for this session
    const existingAttendance = await Attendance.findOne({
      studentId,
      sessionId: activeSession.sessionId
    });
    
    if (existingAttendance && !activeSession.settings.allowMultipleAttendance) {
      return res.status(400).json({ 
        error: 'Attendance already marked for this session' 
      });
    }
    
    // Update student device binding
    if (!student.deviceId) {
      student.deviceId = deviceId;
      await student.save();
    }
    
    // Create attendance record
    const attendance = new Attendance({
      studentId,
      studentName: student.name,
      sessionId: activeSession.sessionId,
      qrCode,
      ipAddress,
      deviceId,
      faceVerified: faceVerified || false,
      verificationTime: verificationTime || 0
    });
    
    await attendance.save();
    
    // Update session stats
    activeSession.presentStudents = await Attendance.countDocuments({
      sessionId: activeSession.sessionId
    });
    await activeSession.save();
    
    // Notify teacher about attendance
    io.emit('attendanceMarked', attendance);
    
    res.json(attendance);
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/attendance', async (req, res) => {
  try {
    const { sessionId, studentId } = req.query;
    let query = {};
    
    if (sessionId) query.sessionId = sessionId;
    if (studentId) query.studentId = studentId;
    
    const attendanceRecords = await Attendance.find(query)
      .populate('studentId', 'name studentId email')
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('joinTeacherRoom', () => {
    socket.join('teacher');
  });
  
  socket.on('joinStudentRoom', () => {
    socket.join('student');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 QR Attendance System running on port ${PORT}`);
  console.log(`📱 Teacher Interface: http://localhost:${PORT}`);
  console.log(`👨‍🎓 Student Interface: http://localhost:${PORT}/student`);
  console.log(`☁️  MongoDB Atlas: Connected`);
});
