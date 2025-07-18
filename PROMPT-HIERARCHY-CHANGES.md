# UserPromptSubmit-Based Hierarchy Implementation

## Overview
The subagent monitoring system needs to be updated to use UserPromptSubmit events as the top-level grouping mechanism instead of session IDs. This provides a clearer view of user interactions and their associated events.

UserPromptSubmit events represent a unique invocation from the user so should be our highest level unit of organizaiton.

The existing UX should largely be maintained as it is now.

## Key Changes

### 1. Event Processing
- Webhook server tracks active prompts per session
- UserPromptSubmit events:
  - Indicate the start of a newly active prompt
  - Automatically interrupt previous active prompts in same session
- All other events should be correlated to one and one only UserPromptSubmit event
- Stop events mark prompts as completed
- Prompts are marked as interrupted when a new UserPromptSubmit event happens with the same session ID as the currently active prompt

### . UI Hierarchy
An example is below of what it might look like.

```
▼ 🗨️ "Create a function to calculate fibonacci"     [2m 30s] [450 tokens] <-- This is the prompt text from the UserPromptSubmit event
  │ ⚡ Prompt started: "Calculate fibonacci"   <-- This is the UserPromptSubmit event itself as a standlone line item
  │ ✓ Task completed: "Calculate fibonacci"        [2.1s] [145 tokens]
  │ ⚡ Edit started: "fibonacci.py"
  │ ✓ Edit completed: "fibonacci.py"               [0.3s]
  │ ✅ Session completed

▶ 🗨️ "Run the fibonacci function with n=10"       [Interrupted]
```

### 3. Edge Case Handling
We may receive multiple UserPromptSubmit events in quick succession if the user has multiple Claude Code windows at once. Observe that a Stop event will be sent when the query is complete but no event is created if the user interrupts the query. In this case, it is critical for us to determine if a new UserPromptSubmit event represents a new query from a different session or interruption of a previous query. Use the combination of the UserPromptSubmit event and the session ID to determine unique invocations or if the user has interrupted a previously running query.

- **Interruptions**: New UserPromptSubmit automatically marks previous prompt as interrupted
- **Stop Events**: Prompts are marked as completed when Stop event is received
- **Interruptions**: New UserPromptSubmit automatically marks previous prompt as interrupted if it has the same session id as a previously started UserPromptSubmit event
- **Multiple Sessions**: Each session tracks its own active prompt
- **Orphaned Events**: Grouped under "Legacy Session" synthetic prompts

## Configuration
The hooks configuration includes Stop hook to track prompt completion and SubagentStop events to track subagent completion.

The hooks configuration can detect and install the appropriate hook for UserPromptSubmit events
* The hooks preview should include the new UserPromptSubmit event hook
* When 'Apply to Config' is pressed, a new hook should be configured for the UserPromptSubmit event

## Benefits
1. **Clear User Flow**: Each user interaction is clearly grouped with its results
2. **Better Organization**: Events are organized by what the user asked for
3. **Interruption Handling**: Gracefully handles when users change their mind
4. **Session Support**: Works correctly with multiple Claude instances