# UserPromptSubmit-Based Hierarchy Implementation

## Overview
The subagent monitoring system has been updated to use UserPromptSubmit events as the top-level grouping mechanism instead of session IDs. This provides a clearer view of user interactions and their associated events.

## Key Changes

### 1. Data Model Updates
- Added new fields to `SubagentInfo`:
  - `parentPromptId`: Links events to their parent UserPromptSubmit
  - `isPromptEvent`: Identifies UserPromptSubmit events
  - `promptText`: Stores the actual user prompt text
  - `promptStatus`: Tracks if prompt is active, completed, or interrupted

- New `PromptGroup` interface for organizing the hierarchy

### 2. Event Processing
- Webhook server tracks active prompts per session
- UserPromptSubmit events:
  - Become parent nodes
  - Automatically interrupt previous active prompts in same session
- All other events link to the active prompt via `parentPromptId`
- Stop events mark prompts as completed
- Prompts are also marked as interrupted when a new prompt starts

### 3. UI Hierarchy
```
▼ 🗨️ "Create a function to calculate fibonacci"     [2m 30s] [450 tokens]
  │ ⚡ Task started: "Calculate fibonacci"
  │ ✓ Task completed: "Calculate fibonacci"        [2.1s] [145 tokens]
  │ ⚡ Edit started: "fibonacci.py"
  │ ✓ Edit completed: "fibonacci.py"               [0.3s]
  │ ✅ Session completed

▶ 🗨️ "Run the fibonacci function with n=10"       [Interrupted]
```

### 4. Edge Case Handling
- **Interruptions**: New UserPromptSubmit automatically marks previous prompt as interrupted
- **Stop Events**: Prompts are marked as completed when Stop event is received
- **Interruptions**: New UserPromptSubmit automatically marks previous prompt as interrupted
- **Multiple Sessions**: Each session tracks its own active prompt
- **Orphaned Events**: Grouped under "Legacy Session" synthetic prompts

## Testing
Use the provided test scripts:
- `test-prompt-hierarchy.js`: Tests various scenarios including normal flow, interruptions, and concurrent sessions
- `test-claude-hook.sh`: Simulates Claude Code webhook events

## Configuration
The hooks configuration includes Stop hook to track prompt completion and SubagentStop events to track subagent completion.

## Benefits
1. **Clear User Flow**: Each user interaction is clearly grouped with its results
2. **Better Organization**: Events are organized by what the user asked for
3. **Interruption Handling**: Gracefully handles when users change their mind
4. **Session Support**: Works correctly with multiple Claude instances