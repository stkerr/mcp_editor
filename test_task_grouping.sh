#!/bin/bash

# Test script to demonstrate task grouping by description
echo "Testing task grouping by description..."

# Session 1: Multiple tasks with different descriptions
echo -e "\n1. Creating tasks in session-1..."

# Task 1: File search (will have 2 events - start and complete)
curl -X POST http://localhost:3001/subagent-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PreToolUse",
    "tool_name": "Task",
    "session_id": "session-1",
    "tool_input": {
      "description": "Search for configuration files",
      "prompt": "Find all config files in the project"
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

sleep 1

# Task 2: Code update (only start event - will show as active)
curl -X POST http://localhost:3001/subagent-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PreToolUse",
    "tool_name": "Task",
    "session_id": "session-1",
    "tool_input": {
      "description": "Update authentication logic",
      "prompt": "Refactor the auth module"
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

sleep 1

# Complete Task 1
curl -X POST http://localhost:3001/subagent-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PostToolUse",
    "tool_name": "Task",
    "session_id": "session-1",
    "tool_input": {
      "description": "Search for configuration files"
    },
    "tool_response": {
      "content": [{
        "type": "text",
        "text": "Found 5 configuration files"
      }],
      "totalDurationMs": 2000,
      "totalTokens": 150,
      "input_tokens": 75,
      "output_tokens": 75
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

sleep 1

# Session 2: Multiple invocations of the same task
echo -e "\n2. Creating repeated tasks in session-2..."

# First invocation of "Run tests"
curl -X POST http://localhost:3001/subagent-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PreToolUse",
    "tool_name": "Task",
    "session_id": "session-2",
    "tool_input": {
      "description": "Run tests",
      "prompt": "Execute the test suite"
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

sleep 1

# Complete first invocation
curl -X POST http://localhost:3001/subagent-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PostToolUse",
    "tool_name": "Task",
    "session_id": "session-2",
    "tool_input": {
      "description": "Run tests"
    },
    "tool_response": {
      "content": [{
        "type": "text",
        "text": "All tests passed (25/25)"
      }],
      "totalDurationMs": 1500,
      "totalTokens": 100
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

sleep 1

# Second invocation of "Run tests" (same description)
curl -X POST http://localhost:3001/subagent-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PreToolUse",
    "tool_name": "Task",
    "session_id": "session-2",
    "tool_input": {
      "description": "Run tests",
      "prompt": "Execute the test suite again after fixes"
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

sleep 1

# Complete second invocation
curl -X POST http://localhost:3001/subagent-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PostToolUse",
    "tool_name": "Task",
    "session_id": "session-2",
    "tool_input": {
      "description": "Run tests"
    },
    "tool_response": {
      "content": [{
        "type": "text",
        "text": "All tests passed (26/26)"
      }],
      "totalDurationMs": 1600,
      "totalTokens": 110
    },
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

echo -e "\n\nTest completed! Check the SubagentMonitor to see:"
echo "- Two sessions displayed at the top level"
echo "- Session 1 has 2 task groups: 'Search for configuration files' (completed) and 'Update authentication logic' (active)"
echo "- Session 2 has 1 task group: 'Run tests' with 2 events (both completed)"
echo "- Click on task groups to expand and see individual PreToolUse/PostToolUse events"