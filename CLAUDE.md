# MCP Editor - Project Overview

## Purpose
MCP Editor is an Electron-based desktop application that provides:
1. A GUI for managing MCP (Model Context Protocol) server configurations for Claude Desktop and Claude Code
2. Real-time monitoring of Claude Code subagents via webhook integration
3. Usage statistics tracking for Claude API consumption

## Key Technologies
- **Electron**: Desktop app framework (v28.2.0)
- **React**: Frontend UI (v18.2.0)
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Vite**: Build tool with electron-vite
- **Radix UI**: Component primitives

## Architecture

### Main Process (`src/main/`)
- `index.ts`: Application entry point, window management
- `config-manager.ts`: Handles reading/writing MCP configurations
- `webhook-server.ts`: Express server receiving Claude Code hook events
- `subagent-queue.ts`: Event queue management for subagent monitoring
- `hooks-config-helpers.ts`: Generates webhook configurations
- `usage-handlers.ts`: Handles ccusage CLI integration
- `file-operations.ts`: File system operations

### Renderer Process (`src/renderer/`)
- `App.tsx`: Main application component with tab navigation
- `components/`:
  - `TabNavigation.tsx`: Main navigation between features
  - `GroupedConfigList.tsx`: MCP server configuration UI
  - `SubagentMonitorPromptBased.tsx`: Hierarchical subagent monitoring
  - `ClaudeUsage.tsx`: Usage statistics dashboard
  - `HooksConfig.tsx`: Webhook configuration generator

### Shared (`src/shared/`)
- `types.ts`: TypeScript interfaces and types
- `constants.ts`: Application constants and configuration paths

## Key Features

### 1. MCP Server Configuration
- Supports both Claude Desktop and Claude Code
- Auto-detects installed applications
- Manages global and project-specific servers
- Environment variable configuration
- Validation before saving

### 2. Subagent Monitoring
- Real-time tracking via webhooks
- Hierarchical display (UserPromptSubmit → SubagentStop events)
- Token usage and performance metrics
- Output log viewing
- Orphaned event handling

### 3. Usage Statistics
- Integrates with ccusage CLI tool
- Daily/weekly/monthly cost tracking
- Model-specific breakdown
- Visual charts and summaries

## Development

### Setup Commands
```bash
npm install       # Install dependencies
npm run dev      # Start development server
npm run build    # Build for production
npm run dist     # Package for distribution
```

### Key Files to Understand
1. `src/shared/types.ts` - All TypeScript interfaces
2. `src/main/webhook-server.ts` - Webhook event handling
3. `src/renderer/components/SubagentMonitorPromptBased.tsx` - Main monitoring UI
4. `src/main/config-manager.ts` - Configuration file management

### Configuration Paths
- **Claude Desktop (Mac)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Code (Mac)**: `~/.config/claude-code/settings.json`
- **Windows/Linux**: See `src/shared/constants.ts` for platform-specific paths

### Webhook Integration
The app runs a local Express server on port 3001 to receive events from Claude Code hooks. Configure hooks in Claude Code settings to point to:
- `http://localhost:3001/webhook/notification`
- `http://localhost:3001/webhook/subagent-stop`
- `http://localhost:3001/webhook/user-prompt-submit`

### Important Notes
- Always validate configurations before saving
- Handle platform-specific path differences
- Maintain backward compatibility with existing configs
- Test webhook connectivity after configuration changes
- The app uses IPC for main/renderer communication

## Recent Changes
- Enhanced subagent UI with completion indicators
- Implemented UserPromptSubmit-based hierarchy
- Fixed webhook relay issues
- Added Claude usage statistics tab with ccusage integration