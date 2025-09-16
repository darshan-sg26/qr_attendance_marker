# QR-Based Attendance Marker System (Cloud Edition)

A comprehensive cloud-based attendance system that uses QR codes and face verification to prevent proxy attendance. The system is connected to MongoDB Atlas for cloud data storage and includes advanced security features.

## 🌟 Features

### Teacher/Smartboard App
- **Visual QR Code Generation** - Generate and display QR codes with images
- **Real-time Student Management** - Add, view, and manage student profiles
- **Live Attendance Monitoring** - Real-time attendance tracking with statistics
- **Session Management** - Create, activate, and deactivate attendance sessions
- **Cloud Data Storage** - All data stored in MongoDB Atlas
- **Download QR Codes** - Export QR codes as images

### Student App
- **QR Code Scanning** - Camera-based QR code scanning
- **Manual QR Entry** - Alternative manual QR code input
- **Face Verification** - Camera-based face verification before attendance
- **Device Restriction** - One student per device to prevent proxy
- **Cloud Synchronization** - Real-time data sync with cloud database
- **Attendance History** - View personal attendance records

### Security Features
- **MongoDB Atlas Integration** - Secure cloud database
- **Device Binding** - Prevents multiple student registrations per device
- **Face Verification** - 10-second face verification with camera
- **IP Address Logging** - All requests tracked with IP addresses
- **Rate Limiting** - Prevents abuse and spam
- **Session Validation** - Time-limited QR codes with validation
- **Real-time Communication** - Socket.io for live updates

## 🚀 Quick Start

### Option 1: Cloud Version (Recommended)
```bash
# Install dependencies
npm install

# Start cloud server
npm start
```

### Option 2: Simple Version (No Dependencies)
```bash
# Run simple server
npm run simple
```

### Option 3: Development Mode
```bash
# Install dependencies
npm install

# Download face recognition models
npm run download-models

# Start development server
npm run dev
```

## 🌐 Access Points
- **Teacher Interface**: http://localhost:3000
- **Student Interface**: http://localhost:3000/student

## Usage

### For Teachers:
1. Open the teacher interface
2. Add students to the system
3. Click "Generate QR Code" to start an attendance session
4. Display the QR code on the smartboard
5. Monitor real-time attendance
6. Click "Deactivate QR" to end the session

### For Students:
1. Open the student interface on your device
2. Register your profile (one-time setup)
3. Wait for teacher to activate QR code
4. Scan the QR code when prompted
5. Complete face verification within 10 seconds
6. Attendance will be automatically marked

## Technical Details

- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.io
- **QR Code Generation**: qrcode library
- **QR Code Scanning**: qr-scanner library
- **Face Verification**: face-api.js
- **Frontend**: Vanilla JavaScript with modern CSS

## Security Measures

1. **Device Binding**: Each device can only register one student profile
2. **Face Verification**: Students must verify their face within 10 seconds
3. **IP Tracking**: All attendance records include IP addresses
4. **Session Management**: QR codes are time-limited and can be deactivated
5. **Real-time Validation**: Server validates all attendance attempts

## File Structure

```
proj_2/
├── server.js              # Main server file
├── package.json           # Dependencies
├── README.md             # This file
└── public/
    ├── teacher.html      # Teacher interface
    ├── student.html      # Student interface
    └── models/           # Face-api.js models (download separately)
```

## Troubleshooting

1. **Camera not working**: Ensure HTTPS or localhost for camera access
2. **Face verification not working**: Check if models are properly downloaded
3. **QR code not scanning**: Ensure good lighting and stable camera
4. **Device already registered**: Clear browser data or use a different device

## Future Enhancements

- Database integration for persistent storage
- Advanced face recognition with training
- Mobile app versions
- Analytics and reporting features
- Multi-classroom support
- Admin dashboard

