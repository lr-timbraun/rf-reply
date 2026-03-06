#!/bin/bash
echo "Starting RFP Analyzer Local Server..."
echo "To enable debug logs in this terminal, run: node server.cjs --debug"
# Try to open the browser automatically
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "http://localhost:3000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000"
  fi
fi
node server.cjs
