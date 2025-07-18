# UserPromptSubmit Hook Integration Test Plan

## Overview
This document outlines the test plan for verifying the UserPromptSubmit hook integration in MCP Editor.

## Test Prerequisites
1. MCP Editor application is built and running
2. Claude Code is installed and configured
3. Webhook server is running on port 3001

## Test Cases

### 1. Configuration Test
**Objective**: Verify UserPromptSubmit hook can be configured

**Steps**:
1. Open MCP Editor
2. Navigate to Subagent Monitor tab
3. Open Hooks Configuration
4. Verify UserPromptSubmit appears in the generated configuration
5. Click "Apply to Config" to add hooks to Claude Code settings

**Expected Result**:
- Configuration should include UserPromptSubmit hook with matcher ".*"
- Hook command should point to correct endpoint (`/prompt-event`)
- Configuration should be successfully applied to Claude Code settings

### 2. Webhook Endpoint Test
**Objective**: Verify the webhook server handles UserPromptSubmit events

**Steps**:
1. Run the test webhook script: `node test-webhook.js`
2. Observe test output for UserPromptSubmit event

**Expected Result**:
- Test should send UserPromptSubmit event to `/prompt-event` endpoint
- Server should respond with 200 status
- Event should be processed successfully

### 3. Event Recording Test
**Objective**: Verify UserPromptSubmit events are recorded and displayed

**Steps**:
1. Start MCP Editor with webhook server
2. Configure Claude Code with UserPromptSubmit hook
3. In Claude Code, submit a user prompt (e.g., "Help me write a Python function")
4. Check Subagent Monitor in MCP Editor

**Expected Result**:
- UserPromptSubmit event should appear in the correct session
- Event description should show "User Prompt: [first 100 chars of prompt]..."
- Event status should be "completed"
- Event should have toolsUsed: ['UserPromptSubmit']

### 4. Session Grouping Test
**Objective**: Verify UserPromptSubmit events are grouped by session

**Steps**:
1. In Claude Code, start a new conversation
2. Submit multiple prompts in the same session
3. Use subagents (Task tool) in between prompts
4. Check Subagent Monitor grouping

**Expected Result**:
- All events (prompts and subagents) should be grouped under the same session ID
- UserPromptSubmit events should appear in chronological order
- Session should show correct counts for all event types

### 5. Mixed Event Test
**Objective**: Verify UserPromptSubmit works alongside other hooks

**Steps**:
1. Configure all hooks (PreToolUse, PostToolUse, SubagentStop, UserPromptSubmit)
2. In Claude Code:
   - Submit a prompt
   - Have Claude use the Task tool
   - Submit another prompt
   - Let the task complete
3. Check event ordering in Subagent Monitor

**Expected Result**:
- Events should appear in correct chronological order:
  1. UserPromptSubmit (first prompt)
  2. PreToolUse (Task start)
  3. UserPromptSubmit (second prompt)
  4. PostToolUse (Task complete)
- All events should be in the same session

### 6. Performance Test
**Objective**: Verify UserPromptSubmit doesn't impact performance

**Steps**:
1. Submit rapid consecutive prompts in Claude Code
2. Monitor MCP Editor responsiveness
3. Check webhook server logs for any errors

**Expected Result**:
- All prompts should be recorded
- No webhook errors or timeouts
- UI remains responsive

## Manual Testing Checklist
- [ ] Hook configuration includes UserPromptSubmit
- [ ] Webhook endpoint `/prompt-event` responds correctly
- [ ] Events are recorded with correct metadata
- [ ] Events are grouped by session ID
- [ ] Event descriptions show prompt preview
- [ ] Events appear in chronological order
- [ ] No performance degradation
- [ ] Works in both development and production modes

## Automated Test Verification
Run the webhook test script to verify basic functionality:
```bash
node test-webhook.js
```

## Troubleshooting
1. **Events not appearing**: Check webhook server is running on correct port
2. **Wrong session grouping**: Verify session_id is being passed correctly
3. **Missing prompt text**: Check tool_input contains user_message or prompt field
4. **Hook not firing**: Verify Claude Code settings contain UserPromptSubmit configuration