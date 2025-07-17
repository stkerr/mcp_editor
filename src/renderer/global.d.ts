interface ConfigAPI {
  loadConfig: (appType: string) => Promise<any>;
  loadGroupedConfig: (appType: string) => Promise<any>;
  saveConfig: (appType: string, config: any) => Promise<any>;
  saveGroupedConfig: (appType: string, groupedConfig: any) => Promise<any>;
  validateConfig: (config: any) => Promise<any>;
  detectApps: () => Promise<any>;
  getSubagents: () => Promise<any>;
  saveSubagent: (subagent: any) => Promise<any>;
  clearSubagents: () => Promise<any>;
  onSubagentUpdate: (callback: (data: any) => void) => () => void;
  applyHooksToConfig: (hooks: any) => Promise<{ success: boolean; backupPath?: string; error?: string }>;
  checkHooksConfigured: (hooks: any) => Promise<{ success: boolean; configured?: boolean; error?: string }>;
  checkCcusageAvailable: () => Promise<{ success: boolean; available: boolean; method: 'direct' | 'npx' | null }>;
  getUsageData: (options?: { raw?: boolean }) => Promise<{ success: boolean; data?: any; rawOutput?: string; error?: string }>;
}

declare global {
  interface Window {
    configAPI: ConfigAPI;
  }
}

export {};