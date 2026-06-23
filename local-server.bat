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
REM  Three supported setups, checked in order:
REM    1) Tunnel installed as a Windows service ("cloudflared service install")
REM    2) A cloudflared.token file in this folder (this script runs the tunnel)
REM    3) Neither -> local-only on http://localhost:8082
REM ==========================================================================

REM --- 1) Is the Cloudflare tunnel already running as a Windows service? ---
sc query cloudflared >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [TUNNEL] Cloudflare tunnel is installed as a Windows service -- your domain is served automatically.
    echo [SYSTEM] Journal server running. Local PC: http://localhost:8082
    echo [SYSTEM] Close this window to stop the journal server.
    pause
    goto :eof
)

REM --- 2) Token file present? Run the tunnel from here. ---
if exist "cloudflared.token" (
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
    goto :eof
)

REM --- 3) No public tunnel configured: local network only. ---
echo.
echo [TUNNEL] No Cloudflare tunnel detected -- running LOCAL ONLY ^(no public domain^).
echo [TUNNEL] To put it on your domain, see "Going public" in README.md
echo [SYSTEM] Journal server running. Local PC: http://localhost:8082
pause
