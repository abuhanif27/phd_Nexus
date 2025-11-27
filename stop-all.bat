@echo off
REM NexusCare - Stop All Services for Windows

echo ===========================================
echo Stopping NexusCare Services
echo ===========================================
echo.

echo Stopping Django backend server...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq NexusCare Backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq NexusCare Backend*" 2>nul

echo Stopping Frontend server (Python HTTP)...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq NexusCare Frontend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq NexusCare Frontend*" 2>nul

echo Stopping React frontend (Node.js)...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq NexusCare React*" 2>nul
taskkill /F /FI "WINDOWTITLE eq NexusCare React*" 2>nul

echo.
echo ===========================================
echo All NexusCare services stopped!
echo ===========================================
echo.
echo Note: If services are still running, you can manually close
echo the command windows or use Task Manager (Ctrl+Shift+Esc)
echo to end python.exe or node.exe processes.
echo.
pause
