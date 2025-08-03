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
  SAVE_GROUPED_CONFIG: 'config:save-grouped',
  VALIDATE_CONFIG: 'config:validate',
  DETECT_APPS: 'config:detect-apps',
  CONFIG_ERROR: 'config:error',
  GET_SUBAGENTS: 'subagents:get',
  SAVE_SUBAGENT: 'subagents:save',
  CLEAR_SUBAGENTS: 'subagents:clear',
  SUBAGENT_UPDATE: 'subagents:update',
  APPLY_HOOKS_TO_CONFIG: 'config:apply-hooks',
  CHECK_HOOKS_CONFIGURED: 'config:check-hooks',
  CHECK_CCUSAGE_AVAILABLE: 'usage:check-available',
  GET_USAGE_DATA: 'usage:get-data',
  WEBHOOK_SERVER_STATUS: 'webhook:status',
  PROMPT_UPDATE: 'prompts:update',
  GET_PROMPTS: 'prompts:get',
  GET_DAG_STATE: 'dag:get-state'
};

export const SUBAGENT_DATA_PATHS: ConfigPaths = {
  windows: '%APPDATA%/MCP Editor/subagents.json',
  mac: '~/Library/Application Support/MCP Editor/subagents.json',
  linux: '~/.config/mcp-editor/subagents.json'
};
