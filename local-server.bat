@echo off
title AscendX Journal Secure Server
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo [SYSTEM] Verifying core + security libraries (express, bcryptjs, sessions, needle)...
call npm install --no-audit --no-fund --quiet

echo [SYSTEM] Launching secure local data core...
start "AscendX Core" /min cmd /c "node server.js"

REM ==========================================================================
REM  Public domain via Cloudflare Tunnel (hides your home IP, no port-forward)
REM  - If cloudflared.token exists, your domain is served automatically.
REM  - If it does not, the app stays LOCAL-ONLY. See README.md "Going public".
REM ==========================================================================
if not exist "cloudflared.token" (
    echo.
    echo [TUNNEL] No cloudflared.token found -- running LOCAL ONLY ^(no public domain^).
    echo [TUNNEL] To put it on your domain, see "Going public" in README.md
    echo.
    echo [SYSTEM] Server running. Local PC: http://localhost:8082
    pause
    goto :eof
)

if not exist "cloudflared.exe" (
    echo [TUNNEL] First run: downloading Cloudflare Tunnel client...
    curl.exe -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
)

set /p CF_TOKEN=<cloudflared.token
echo [TUNNEL] Connecting your domain through Cloudflare ^(home IP stays hidden^)...
cloudflared.exe tunnel run --token !CF_TOKEN!

echo.
echo [TUNNEL] Tunnel stopped. The local server window may still be open.
pause
