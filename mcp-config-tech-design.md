# MCP Configuration Manager - Technical Design

## Architecture Overview

### Application Type
- **Electron** desktop application
  - Provides native file system access
  - Cross-platform (Windows, macOS, Linux)
  - Can be distributed as standalone app
  - Secure local file operations

### Tech Stack
- **Frontend**: React + TypeScript
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Backend**: Electron main process
- **Build Tool**: Vite
- **Package Manager**: npm/yarn

## File Structure
```
mcp-config-manager/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts
│   │   ├── config-manager.ts
│   │   └── file-operations.ts
│   ├── renderer/       # React app
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── utils/
│   └── shared/         # Shared types/constants
├── electron.vite.config.ts
└── package.json
```

## Core Components

### 1. Configuration File Locations
```typescript
const CONFIG_PATHS = {
  claudeDesktop: {
    windows: '%APPDATA%/Claude/claude_desktop_config.json',
    mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
    linux: '~/.config/Claude/claude_desktop_config.json'
  },
  claudeCode: {
    // Platform-specific paths for Claude Code
  }
}
```

### 2. Configuration Schema
```typescript
interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface MCPConfiguration {
  mcpServers: {
    [serverName: string]: MCPServerConfig;
  }
}
```

### 3. Main Process APIs
```typescript
// Exposed via Electron IPC
interface ConfigAPI {
  loadConfig(app: 'desktop' | 'code'): Promise<MCPConfiguration>;
  saveConfig(app: 'desktop' | 'code', config: MCPConfiguration): Promise<void>;
  validateConfig(config: MCPConfiguration): Promise<ValidationResult>;
  detectInstalledApps(): Promise<string[]>;
}
```

### 4. UI Components
- **ConfigList**: Display all MCP servers
- **ConfigEditor**: Form-based editor with fields for:
  - Server name
  - Command
  - Arguments (dynamic list)
  - Environment variables (key-value pairs)
- **JSONEditor**: Raw JSON editing mode
- **ValidationDisplay**: Show errors/warnings

## Data Flow
1. App startup → Detect installed Claude apps
2. Load configurations from file system
3. Display in UI with edit capabilities
4. Validate changes before saving
5. Write back to configuration files
6. Optional: Restart Claude apps to apply changes

## Security Considerations
- Sandboxed file system access
- Validate all inputs
- Sanitize file paths
- No external network requests
- Code signing for distribution

## Error Handling
- File permission errors
- Invalid JSON parsing
- Missing configuration files
- Validation failures
- Platform-specific edge cases

## Development Phases
1. **Phase 1**: Basic Electron setup with file operations
2. **Phase 2**: UI components and configuration display
3. **Phase 3**: Edit functionality with validation
4. **Phase 4**: Platform detection and multi-app support
5. **Phase 5**: Polish, error handling, and distribution