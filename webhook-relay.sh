#!/bin/bash
# Webhook relay script for MCP Editor development
# This script receives hook data from Claude Code and forwards it to the MCP Editor webhook server

# Read stdin data (hook input from Claude Code)
HOOK_DATA=$(cat)

# Forward to MCP Editor webhook server
echo "$HOOK_DATA" | curl -X POST \
  -H "Content-Type: application/json" \
  -d @- \
  "http://localhost:3001/$1" \
  --silent \
  --show-error

# Exit with curl's exit code
exit $?