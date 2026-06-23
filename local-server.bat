@echo off
title AscendX Journal Secure Server
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo [SYSTEM] Verifying core + security libraries (express, bcryptjs, sessions, nodemailer, needle)...
call npm install --no-audit --no-fund --quiet

echo [SYSTEM] All libraries verified. Launching secure local data core...
node server.js
pause
