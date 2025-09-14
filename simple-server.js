const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple UUID generator (no external dependencies)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Simple in-memory storage
let students = [];
let attendanceRecords = [];
let activeQRCode = null;
let qrSession = null;
let studentDevices = new Map();

const server = http.createServer((req, res) => {
  const url = req.url;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve static files
  if (url === '/' || url === '/teacher') {
    serveFile(res, 'public/teacher-simple.html');
  } else if (url === '/student') {
    serveFile(res, 'public/student-simple.html');
  } else if (url.startsWith('/api/')) {
    handleAPI(req, res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    const ext = path.extname(filePath);
    const contentType = getContentType(ext);
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getContentType(ext) {
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
  };
  return types[ext] || 'text/plain';
}

function handleAPI(req, res) {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      
      if (req.url === '/api/students' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(students));
      } else if (req.url === '/api/students' && req.method === 'POST') {
        const student = {
          id: generateUUID(),
          name: data.name,
          studentId: data.studentId,
          email: data.email,
          registeredAt: new Date()
        };
        students.push(student);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(student));
      } else if (req.url === '/api/qr/generate' && req.method === 'POST') {
        qrSession = {
          id: generateUUID(),
          teacherId: data.teacherId,
          sessionName: data.sessionName,
          createdAt: new Date(),
          isActive: true
        };
        activeQRCode = qrSession.id;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ qrCode: qrSession.id, session: qrSession }));
      } else if (req.url === '/api/qr/deactivate' && req.method === 'POST') {
        activeQRCode = null;
        qrSession = null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else if (req.url === '/api/qr/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          isActive: !!activeQRCode, 
          session: qrSession 
        }));
      } else if (req.url === '/api/attendance/mark' && req.method === 'POST') {
        const { studentId, qrCode, deviceId } = data;
        
        if (!activeQRCode || qrCode !== activeQRCode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'QR code is not active or invalid' }));
          return;
        }
        
        const student = students.find(s => s.id === studentId);
        if (!student) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Student not found' }));
          return;
        }
        
        if (studentDevices.has(deviceId) && studentDevices.get(deviceId) !== studentId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Device already registered to another student' }));
          return;
        }
        
        studentDevices.set(deviceId, studentId);
        
        const attendance = {
          id: generateUUID(),
          studentId,
          studentName: student.name,
          qrCode,
          ipAddress: '127.0.0.1',
          timestamp: new Date(),
          deviceId
        };
        
        attendanceRecords.push(attendance);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(attendance));
      } else if (req.url === '/api/attendance' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(attendanceRecords));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API endpoint not found' }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Simple QR Attendance System running on port ${PORT}`);
  console.log(`Teacher Interface: http://localhost:${PORT}`);
  console.log(`Student Interface: http://localhost:${PORT}/student`);
  console.log('\nNote: This is a simplified version without face verification.');
  console.log('For full features, install dependencies and run: npm start');
});
