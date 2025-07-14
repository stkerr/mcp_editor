# Subagent Monitoring Setup Guide

The MCP Editor now includes functionality to monitor Claude Code subagent activity in real-time. This feature allows you to track when subagents are created, what tools they use, and their current status.

## Features

- **Real-time monitoring**: See subagent activity as it happens
- **Detailed information**: View session IDs, tools used, start/end times, and status
- **Hook configuration generator**: Automatically generate the required Claude Code hooks
- **Persistent storage**: Subagent data is stored locally and persists between app sessions
- **Clean UI**: Integrated into the MCP Editor with a dedicated tab

## Setup Instructions

### 1. Start the MCP Editor

```bash
npm run dev
# or
npm run build && npm start
```

### 2. Navigate to Subagent Monitor

1. Open the MCP Editor application
2. Switch to "Claude Code" if not already selected
3. Click on the "Subagent Monitor" tab
4. Click "Configure Hooks" button

### 3. Generate Hook Configuration

1. Review the generated webhook port (default: 3001)
2. Optionally customize the MCP Editor executable path
3. Copy the generated hooks configuration

### 4. Install Hooks in Claude Code

1. Open your Claude Code settings file:
   - **macOS**: `~/.config/claude-code/settings.json`
   - **Windows**: `%APPDATA%/claude-code/settings.json`
   - **Linux**: `~/.config/claude-code/settings.json`

2. Add or merge the generated hooks configuration into your settings file:

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "\"/Applications/MCP Editor.app/Contents/MacOS/MCP Editor\" --webhook http://localhost:3001/subagent-event"
          }
        ]
      }
    ],
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

3. Save the file and restart Claude Code

### 5. Test the Integration

1. Use the included test script:
   ```bash
   node test-webhook.js
   ```

2. Start using subagents in Claude Code:
   - Create tasks that require subagents
   - Use the Task tool in Claude Code
   - Monitor the Subagent Monitor tab for real-time updates

## How It Works

### Webhook Server

The MCP Editor runs a local HTTP server on port 3001 (configurable) that receives webhook events from Claude Code hooks. The server:

- Listens for POST requests on `/subagent-event` and `/tool-event`
- Processes hook data and extracts subagent information
- Stores data locally in JSON format
- Sends real-time updates to the UI

### Data Storage

Subagent data is stored locally at:
- **macOS**: `~/Library/Application Support/MCP Editor/subagents.json`
- **Windows**: `%APPDATA%/MCP Editor/subagents.json`
- **Linux**: `~/.config/mcp-editor/subagents.json`

The storage system:
- Automatically creates directories if they don't exist
- Creates backups before writing new data
- Limits storage to the last 100 entries to prevent file size issues

### Real-time Updates

The UI receives real-time updates through:
- IPC communication between main and renderer processes
- Automatic refresh every 5 seconds as fallback
- Live notifications when new subagent data arrives

## Troubleshooting

### Webhook Server Not Starting

1. Check if port 3001 is already in use:
   ```bash
   lsof -i :3001
   ```

2. Change the port in the hook configuration if needed

### No Subagent Data Appearing

1. Verify Claude Code hooks are correctly configured
2. Check the Claude Code console for hook execution errors
3. Test the webhook server with the test script
4. Ensure the MCP Editor executable path is correct in the hooks

### Permission Issues

1. Make sure the MCP Editor has permission to write to the data directory
2. Check file permissions on the hooks configuration in Claude Code

## API Reference

### Webhook Endpoints

- `GET /health` - Health check endpoint
- `POST /subagent-event` - Receives SubagentStop hook events
- `POST /tool-event` - Receives PreToolUse hook events

### IPC Channels

- `subagents:get` - Load stored subagent data
- `subagents:save` - Save new subagent information
- `subagents:clear` - Clear all subagent data
- `subagents:update` - Real-time update notification

## Development

### Testing

```bash
# Build the application
npm run build

# Run webhook tests
node test-webhook.js

# Start in development mode
npm run dev
```

### File Structure

```
src/
├── main/
│   ├── webhook-server.ts     # HTTP server for receiving hooks
│   ├── file-operations.ts    # Subagent data storage
│   └── config-manager.ts     # IPC handlers
├── renderer/
│   ├── components/
│   │   ├── SubagentMonitor.tsx   # Main monitoring UI
│   │   ├── HooksConfig.tsx       # Hook configuration generator
│   │   └── TabNavigation.tsx     # Tab navigation system
│   └── App.tsx                   # Updated with new views
└── shared/
    ├── types.ts              # Subagent interfaces
    └── constants.ts          # IPC channels and paths
```

---

For more information about Claude Code hooks, see the [official documentation](https://docs.anthropic.com/en/docs/claude-code/hooks).