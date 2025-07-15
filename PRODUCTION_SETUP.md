# MCP Editor Production Setup

## Installation
1. Open the DMG file: `release/1.0.0/MCP Editor_1.0.0_arm64.dmg`
2. Drag "MCP Editor" to your Applications folder
3. First launch: Right-click and select "Open" to bypass macOS Gatekeeper

## Configure Claude Code Hooks

The packaged app now works as a webhook relay. Here's how to set it up:

1. **Launch MCP Editor**
2. **Go to Settings → Hooks Config**
3. **Toggle OFF "Development Mode"** (it should auto-detect production)
4. **Copy the generated hooks configuration**
5. **Add to your Claude Code settings** (`~/.config/claude-code/settings.json`):

Example hooks configuration for production:
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
    ],
    "PostToolUse": [
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

## Key Changes Made

1. **Webhook Relay Support**: The app now accepts `--webhook` argument to relay events
2. **Proper Data Directory**: Uses `~/Library/Application Support/MCP Editor/` for data storage
3. **Auto-detect Production**: Automatically detects if running as packaged app
4. **Fixed Icon Path**: Icon properly displays in production builds

## Testing

To test subagent monitoring:
1. Ensure MCP Editor is running
2. In Claude Code, create subagents using the Task tool
3. You should see them appear in the Subagent Monitor in real-time

## Troubleshooting

- **No events showing**: Check that the webhook server is running (port 3001)
- **Permission errors**: The app may need permission to access Application Support folder
- **Hook not working**: Ensure the app path in hooks config matches your installation