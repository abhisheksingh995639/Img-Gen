@echo off
echo Installing React Frontend Dependencies...
cd frontend
call npm install
echo Starting Z-Image Turbo Custom Web UI...
call npm run dev
pause
