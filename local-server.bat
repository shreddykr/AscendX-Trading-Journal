@echo off
title Local Trading Journal Server
cd /d "%~dp0"

if not exist "node_modules\" (
    echo [SYSTEM] First-time setup: Installing required modules...
    call npm install
)

echo [SYSTEM] Starting server...
node server.js
pause
