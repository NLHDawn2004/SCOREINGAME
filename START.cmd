@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Can cai Node.js de chay ban local. Hoac dung duong dan web da cung cap.
 pause
 exit /b 1
)
start "" "http://127.0.0.1:4173"
node serve.mjs
pause
