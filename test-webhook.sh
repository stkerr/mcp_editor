#!/bin/bash

# Test script for webhook functionality

echo "Testing MCP Editor webhook relay..."
echo

# Test 1: Direct test to running app's webhook server
echo "Test 1: Direct webhook server test"
curl -X POST http://localhost:3001/tool-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PreToolUse",
    "tool_name": "Task",
    "session_id": "test-direct-'$(date +%s)'",
    "tool_input": {
      "description": "Direct Test Event",
      "prompt": "Testing direct webhook connection"
    }
  }'
echo
echo

# Test 2: Test via packaged app relay
echo "Test 2: Testing packaged app relay"
echo '{
  "hook_event_name": "PreToolUse",
  "tool_name": "Task", 
  "session_id": "test-relay-'$(date +%s)'",
  "tool_input": {
    "description": "Relay Test Event",
    "prompt": "Testing webhook relay through app"
  }
}' | "/Applications/MCP Editor.app/Contents/MacOS/MCP Editor" --webhook http://localhost:3001/tool-event

echo
echo "Tests complete. Check the Subagent Monitor in MCP Editor."