#!/bin/bash
# Webhook relay script for MCP Editor
# This script reads from stdin and forwards to the MCP Editor webhook server

# Read all input from stdin
input=$(cat)

# Forward to webhook server using curl
curl -X POST \
  "$1" \
  -H "Content-Type: application/json" \
  -d "$input" \
  --silent \
  --fail \
  --show-error

# Exit with curl's exit code
exit $?