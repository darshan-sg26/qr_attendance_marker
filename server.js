const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Security middleware
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

// In-memory storage (in production, use a database)
let students = [];
let attendanceRecords = [];
let activeQRCode = null;
let qrSession = null;

// Student device tracking
let studentDevices = new Map(); // deviceId -> studentId

// Security features
let failedAttempts = new Map(); // ip -> count
let blockedIPs = new Set();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

// Rate limiting
let requestCounts = new Map(); // ip -> {count, resetTime}
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teacher.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// API Routes
app.post('/api/students', (req, res) => {
  const { name, studentId, email } = req.body;
  const student = {
    id: uuidv4(),
    name,
    studentId,
    email,
    registeredAt: new Date()
  };
  students.push(student);
  res.json(student);
});

app.get('/api/students', (req, res) => {
  res.json(students);
});

app.post('/api/qr/generate', (req, res) => {
  const { teacherId, sessionName } = req.body;
  qrSession = {
    id: uuidv4(),
    teacherId,
    sessionName,
    createdAt: new Date(),
    isActive: true
  };
  activeQRCode = qrSession.id;
  
  // Notify all students that QR is active
  io.emit('qrActive', qrSession);
  
  res.json({ qrCode: qrSession.id, session: qrSession });
});

app.post('/api/qr/deactivate', (req, res) => {
  activeQRCode = null;
  qrSession = null;
  io.emit('qrInactive');
  res.json({ success: true });
});

app.post('/api/attendance/mark', (req, res) => {
  const { studentId, qrCode, deviceId } = req.body;
  const ipAddress = req.clientIP;
  
  // Security checks
  if (!studentId || !qrCode || !deviceId) {
    recordFailedAttempt(ipAddress);
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (!activeQRCode || qrCode !== activeQRCode) {
    recordFailedAttempt(ipAddress);
    return res.status(400).json({ error: 'QR code is not active or invalid' });
  }
  
  const student = students.find(s => s.id === studentId);
  if (!student) {
    recordFailedAttempt(ipAddress);
    return res.status(404).json({ error: 'Student not found' });
  }
  
  // Check if device is already registered to another student
  if (studentDevices.has(deviceId) && studentDevices.get(deviceId) !== studentId) {
    recordFailedAttempt(ipAddress);
    return res.status(400).json({ error: 'Device already registered to another student' });
  }
  
  // Check if student already marked attendance for this session
  const existingAttendance = attendanceRecords.find(record => 
    record.studentId === studentId && record.qrCode === qrCode
  );
  
  if (existingAttendance) {
    return res.status(400).json({ error: 'Attendance already marked for this session' });
  }
  
  // Register device to student
  studentDevices.set(deviceId, studentId);
  
  const attendance = {
    id: uuidv4(),
    studentId,
    studentName: student.name,
    qrCode,
    ipAddress,
    timestamp: new Date(),
    deviceId,
    sessionId: qrSession?.id
  };
  
  attendanceRecords.push(attendance);
  
  // Notify teacher about attendance
  io.emit('attendanceMarked', attendance);
  
  res.json(attendance);
});

app.get('/api/attendance', (req, res) => {
  res.json(attendanceRecords);
});

app.get('/api/qr/status', (req, res) => {
  res.json({ 
    isActive: !!activeQRCode, 
    session: qrSession 
  });
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Teacher interface: http://localhost:${PORT}`);
  console.log(`Student interface: http://localhost:${PORT}/student`);
});
