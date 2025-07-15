# Webhook Troubleshooting Guide

## Common Issues with Webhook Arguments in Packaged Electron Apps

### Issue: Webhook argument not detected in packaged app

When running the packaged MCP Editor app with `--webhook` argument, the app may not detect the webhook mode and instead launches the GUI.

### Root Causes

1. **Argument Parsing Differences**: In packaged Electron apps, `process.argv` behaves differently than in development
2. **Platform-specific Issues**: macOS, Windows, and Linux handle command-line arguments differently
3. **Stdin Availability**: Packaged apps may have limited stdin access in certain contexts

### Solutions Implemented

1. **Enhanced Logging**
   - Added comprehensive logging of process arguments
   - Shows whether app is running in packaged mode
   - Logs webhook detection and processing steps

2. **Dual Argument Detection**
   - Primary: Uses `process.argv` array scanning
   - Fallback: Uses Electron's `app.commandLine` API

3. **Better Error Handling**
   - Added try-catch blocks around stdin operations
   - Added stdin error event listeners
   - Improved timeout handling

### Testing the Webhook

1. **Check if webhook server is running**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Test webhook directly**:
   ```bash
   ./test-webhook.sh
   ```

3. **Manual test with sample data**:
   ```bash
   echo '{"hook_event_name": "PreToolUse", "tool_name": "Task", "session_id": "test-123", "tool_input": {"description": "Test task"}}' | "/Applications/MCP Editor.app/Contents/MacOS/MCP Editor" --webhook http://localhost:3001/tool-event
   ```

### Debugging Steps

1. **Check Console Logs**: The app now logs all arguments it receives
2. **Verify Webhook Server**: Ensure the webhook server is running on port 3001
3. **Test with Simple Echo**: Try `echo "test" | "/Applications/MCP Editor.app/Contents/MacOS/MCP Editor" --webhook http://localhost:3001/test`

### Platform-Specific Notes

#### macOS
- Use the full path to the executable inside the .app bundle
- Avoid using `open` command with --args as it may not pass arguments correctly

#### Windows
- Ensure paths with spaces are properly quoted
- Use forward slashes or escaped backslashes in paths

#### Linux
- AppImage may require special handling for command-line arguments
- Check file permissions on the executable

### Alternative Approaches

If webhook mode continues to fail:

1. **Use Development Mode**: Run the app in development mode with the webhook-relay.sh script
2. **Direct API Calls**: Make HTTP POST requests directly to the webhook server
3. **File-based Communication**: Write events to a watched file instead of using stdin

### Configuration Format

Ensure your Claude Code hooks are configured correctly:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "\"/Applications/MCP Editor.app/Contents/MacOS/MCP Editor\" --webhook http://localhost:3001/tool-event"
          }
        ]
      }
    ]
  }
}
```

Note the escaped quotes around the executable path to handle spaces correctly.