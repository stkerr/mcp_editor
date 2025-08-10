@echo off
REM Webhook relay script for MCP Editor (Windows)
REM This script reads from stdin and forwards to the MCP Editor webhook server

setlocal enabledelayedexpansion

REM Create a temporary file to store the input
set "tempfile=%TEMP%\webhook_input_%RANDOM%.json"

REM Read all input from stdin and save to temp file
more > "%tempfile%"

REM Forward to webhook server using curl
REM Windows curl should be available on Windows 10+ 
curl -X POST ^
  "%~1" ^
  -H "Content-Type: application/json" ^
  --data-binary "@%tempfile%" ^
  --silent ^
  --fail ^
  --show-error

REM Capture the exit code
set "exitcode=%ERRORLEVEL%"

REM Clean up the temp file
del "%tempfile%" 2>nul

REM Exit with curl's exit code
exit /b %exitcode%