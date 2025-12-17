@echo off
REM ========================================
REM Run All Simulators (Windows)
REM ========================================
REM Starts both Alliance and CoolBreeze simulators
REM ========================================

echo =========================================
echo Starting Fake Data Stream Simulators
echo =========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo Starting Alliance Heatpump simulator...
start "Alliance Heatpump Simulator" cmd /k node alliance-heatpump-simulator.js

echo Starting CoolBreeze Evaporative simulator...
start "CoolBreeze Evaporative Simulator" cmd /k node coolbreeze-evaporative-simulator.js

echo.
echo =========================================
echo Both simulators are now running!
echo =========================================
echo.
echo Two new command windows have opened.
echo Close those windows to stop the simulators.
echo.
pause

