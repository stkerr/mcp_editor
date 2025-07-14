# MCP Editor

A desktop application for managing MCP (Model Context Protocol) server configurations for Claude Desktop and Claude Code, with integrated subagent monitoring capabilities.

## Features

### MCP Server Configuration
- **Multi-app support**: Manage configurations for both Claude Desktop and Claude Code
- **Visual server management**: Add, edit, and remove MCP servers with an intuitive GUI
- **Environment variable support**: Configure server-specific environment variables
- **Auto-detection**: Automatically detects installed Claude applications
- **Configuration validation**: Validates server configurations before saving

### Subagent Monitoring (Claude Code)
- **Real-time monitoring**: Track active and completed subagents in real-time
- **Detailed metrics**: View duration, token usage, and performance statistics
- **Interactive UI**: Click on any subagent to see comprehensive details
- **Output logs**: View and download subagent output logs
- **Webhook integration**: Receives events from Claude Code hooks

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mcp-editor.git
cd mcp-editor
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Configuration

### Setting up Subagent Monitoring

1. Open MCP Editor and navigate to the "Subagent Monitor" tab
2. Click "Configure Hooks" to generate the webhook configuration
3. Copy the generated configuration
4. Add it to your Claude Code settings file
5. Restart Claude Code

The webhook server runs on `http://localhost:3001` and receives events from Claude Code hooks.

## Development

### Project Structure
```
mcp_editor/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React frontend
│   └── shared/         # Shared types and constants
├── electron.vite.config.ts
├── package.json
└── README.md
```

### Technologies Used
- **Electron**: Cross-platform desktop application framework
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Build tool and dev server

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

Built to enhance the Claude Desktop and Claude Code experience by providing a user-friendly interface for MCP server configuration and subagent monitoring.
