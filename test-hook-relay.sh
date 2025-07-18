#!/bin/bash

echo "=== Testing MCP Editor Hook Relay ==="
echo ""

# Test event data that Claude Code would send
TEST_EVENT='{
  "hook_event_name": "UserPromptSubmit",
  "session_id": "test-relay-001",
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "tool_input": {
    "prompt": "Test prompt from relay test"
  }
}'

echo "1. First, make sure MCP Editor app is running"
echo "   Check if you can see the app window"
echo ""
echo "2. Testing webhook relay with UserPromptSubmit event..."
echo ""

# Test the relay mechanism (simulating what Claude Code does)
echo "$TEST_EVENT" | "/Applications/MCP Editor.app/Contents/MacOS/MCP Editor" --webhook http://localhost:3001/prompt-event

echo ""
echo "3. Check the exit code: $?"
echo ""
echo "If exit code is 0, the relay worked!"
echo "Check the MCP Editor app to see if the event was received."