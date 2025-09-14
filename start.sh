#!/bin/bash
echo "Starting QR Attendance System..."
echo ""
echo "Installing dependencies..."
npm install
echo ""
echo "Downloading face recognition models..."
npm run download-models
echo ""
echo "Starting server..."
echo ""
echo "Teacher Interface: http://localhost:3000"
echo "Student Interface: http://localhost:3000/student"
echo ""
npm start
