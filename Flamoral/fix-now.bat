@echo off
echo Running TypeScript fixes...
powershell -ExecutionPolicy Bypass -File "%~dp0apply-typescript-fixes.ps1"
pause
