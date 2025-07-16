import { ipcMain } from 'electron';
import { IPC_CHANNELS, CONFIG_PATHS } from '../shared/constants';
import { AppType, MCPConfiguration, ValidationResult, SubagentInfo } from '../shared/types';
import { 
  readConfigFile, 
  readGroupedConfigFile,
  writeConfigFile, 
  getPlatform, 
  detectInstalledApps,
  readSubagentData,
  clearSubagentData
} from './file-operations';
import { addSubagentInfo } from './subagent-queue';

export function setupConfigHandlers() {
  // Load configuration
  ipcMain.handle(IPC_CHANNELS.LOAD_CONFIG, async (_, appType: AppType) => {
    try {
      const platform = getPlatform();
      const appKey = appType === 'desktop' ? 'claudeDesktop' : 'claudeCode';
      const configPath = CONFIG_PATHS[appKey][platform];
      
      const config = await readConfigFile(configPath);
      return { success: true, data: config };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to load configuration: ${(error as Error).message}` 
      };
    }
  });

  // Save configuration
  ipcMain.handle(IPC_CHANNELS.SAVE_CONFIG, async (_, appType: AppType, config: MCPConfiguration) => {
    try {
      const platform = getPlatform();
      const appKey = appType === 'desktop' ? 'claudeDesktop' : 'claudeCode';
      const configPath = CONFIG_PATHS[appKey][platform];
      
      await writeConfigFile(configPath, config);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to save configuration: ${(error as Error).message}` 
      };
    }
  });

  // Load grouped configuration (for Claude Code)
  ipcMain.handle(IPC_CHANNELS.LOAD_GROUPED_CONFIG, async (_, appType: AppType) => {
    try {
      const platform = getPlatform();
      const appKey = appType === 'desktop' ? 'claudeDesktop' : 'claudeCode';
      const configPath = CONFIG_PATHS[appKey][platform];
      
      const config = await readGroupedConfigFile(configPath);
      return { success: true, data: config };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to load grouped configuration: ${(error as Error).message}` 
      };
    }
  });

  // Validate configuration
  ipcMain.handle(IPC_CHANNELS.VALIDATE_CONFIG, async (_, config: MCPConfiguration): Promise<ValidationResult> => {
    const errors: string[] = [];

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      errors.push('Configuration must have mcpServers object');
      return { valid: false, errors };
    }

    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      if (!serverConfig.command || typeof serverConfig.command !== 'string') {
        errors.push(`Server "${serverName}" must have a command string`);
      }

      if (serverConfig.args && !Array.isArray(serverConfig.args)) {
        errors.push(`Server "${serverName}" args must be an array`);
      }

      if (serverConfig.env && typeof serverConfig.env !== 'object') {
        errors.push(`Server "${serverName}" env must be an object`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  });

  // Detect installed apps
  ipcMain.handle(IPC_CHANNELS.DETECT_APPS, async () => {
    try {
      const apps = await detectInstalledApps();
      return { success: true, data: apps };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to detect apps: ${(error as Error).message}` 
      };
    }
  });

  // Get subagent data
  ipcMain.handle(IPC_CHANNELS.GET_SUBAGENTS, async () => {
    try {
      const subagents = await readSubagentData();
      return { success: true, data: subagents };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to load subagent data: ${(error as Error).message}` 
      };
    }
  });

  // Save subagent info
  ipcMain.handle(IPC_CHANNELS.SAVE_SUBAGENT, async (_, subagent: SubagentInfo) => {
    try {
      await addSubagentInfo(subagent);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to save subagent data: ${(error as Error).message}` 
      };
    }
  });

  // Clear subagent data
  ipcMain.handle(IPC_CHANNELS.CLEAR_SUBAGENTS, async () => {
    try {
      await clearSubagentData();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to clear subagent data: ${(error as Error).message}` 
      };
    }
  });
}
