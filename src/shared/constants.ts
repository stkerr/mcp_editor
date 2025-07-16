import { ConfigPaths } from './types';

export const CONFIG_PATHS: Record<string, ConfigPaths> = {
  claudeDesktop: {
    windows: '%APPDATA%/Claude/claude_desktop_config.json',
    mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
    linux: '~/.config/Claude/claude_desktop_config.json'
  },
  claudeCode: {
    windows: '~/.claude.json',
    mac: '~/.claude.json',
    linux: '~/.claude.json'
  }
};

export const IPC_CHANNELS = {
  LOAD_CONFIG: 'config:load',
  LOAD_GROUPED_CONFIG: 'config:load-grouped',
  SAVE_CONFIG: 'config:save',
  VALIDATE_CONFIG: 'config:validate',
  DETECT_APPS: 'config:detect-apps',
  CONFIG_ERROR: 'config:error',
  GET_SUBAGENTS: 'subagents:get',
  SAVE_SUBAGENT: 'subagents:save',
  CLEAR_SUBAGENTS: 'subagents:clear',
  SUBAGENT_UPDATE: 'subagents:update'
};

export const SUBAGENT_DATA_PATHS: ConfigPaths = {
  windows: '%APPDATA%/MCP Editor/subagents.json',
  mac: '~/Library/Application Support/MCP Editor/subagents.json',
  linux: '~/.config/mcp-editor/subagents.json'
};
