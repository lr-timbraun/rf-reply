@echo off
echo Starting RFP Analyzer Local Server...
echo To enable debug logs in this console, run: node server.cjs --debug
start http://localhost:3000
node server.cjs
pause
