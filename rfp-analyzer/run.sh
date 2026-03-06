#!/bin/bash
echo "Starting RFP Analyzer Local Server..."
# Try to open the browser automatically
if [[ "$OSTYPE" == "darwin"* ]]; then
  open "http://localhost:3000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if command -v xdg-open > /dev/null; then
    xdg-open "http://localhost:3000"
  fi
fi
node server.cjs
