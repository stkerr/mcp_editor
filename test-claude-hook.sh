#!/bin/bash

echo "=== Simulating Claude Code Hook Events ==="
echo ""
echo "This test simulates the exact sequence of events when you use a subagent in Claude Code"
echo ""

# Simulate PreToolUse event (when Task tool starts)
echo "1. Simulating PreToolUse for Task tool (subagent starting)..."
PRETOOL_EVENT='{
  "hook_event_name": "PreToolUse",
  "tool_name": "Task",
  "session_id": "claude-test-'$(date +%s)'",
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "tool_input": {
    "description": "Wait for 2 seconds",
    "prompt": "Your task is to wait for 2 seconds. Use the bash sleep command to pause for 2 seconds, then confirm that the wait is complete."
  }
}'

echo "$PRETOOL_EVENT" | "/Applications/MCP Editor.app/Contents/MacOS/MCP Editor" --webhook http://localhost:3001/tool-event
echo "PreToolUse exit code: $?"
echo ""

# Wait a bit to simulate processing time
sleep 2

# Simulate PostToolUse event (when Task tool completes)
echo "2. Simulating PostToolUse for Task tool (subagent completed)..."
POSTTOOL_EVENT='{
  "hook_event_name": "PostToolUse",
  "tool_name": "Task",
  "session_id": "claude-test-'$(date +%s)'",
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "tool_input": {
    "description": "Wait for 2 seconds",
    "prompt": "Your task is to wait for 2 seconds. Use the bash sleep command to pause for 2 seconds, then confirm that the wait is complete."
  },
  "tool_response": {
    "content": [
      {
        "type": "text",
        "text": "The 2-second wait has been completed successfully. I used the bash sleep 2 command to pause execution for exactly 2 seconds as requested."
      }
    ],
    "totalDurationMs": 2150,
    "totalTokens": 145,
    "input_tokens": 89,
    "output_tokens": 56
  }
}'

echo "$POSTTOOL_EVENT" | "/Applications/MCP Editor.app/Contents/MacOS/MCP Editor" --webhook http://localhost:3001/tool-event
echo "PostToolUse exit code: $?"
echo ""

echo "=== Test Complete ==="
echo "Check the MCP Editor app - you should see:"
echo "1. A new subagent appear when PreToolUse fires"
echo "2. The subagent complete when PostToolUse fires"