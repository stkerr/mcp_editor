const { contextBridge, ipcRenderer } = require('electron');

const IPC_CHANNELS = {
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
  GET_USAGE_DATA: 'usage:get-data'
};

const configAPI = {
  loadConfig: (appType: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_CONFIG, appType),
  
  loadGroupedConfig: (appType: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_GROUPED_CONFIG, appType),
  
  saveConfig: (appType: any, config: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_CONFIG, appType, config),
  
  saveGroupedConfig: (appType: any, groupedConfig: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_GROUPED_CONFIG, appType, groupedConfig),
  
  validateConfig: (config: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_CONFIG, config),
  
  detectApps: () => 
    ipcRenderer.invoke(IPC_CHANNELS.DETECT_APPS),
  
  getSubagents: () => 
    ipcRenderer.invoke(IPC_CHANNELS.GET_SUBAGENTS),
  
  saveSubagent: (subagent: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SUBAGENT, subagent),
  
  clearSubagents: () => 
    ipcRenderer.invoke(IPC_CHANNELS.CLEAR_SUBAGENTS),
  
  onSubagentUpdate: (callback: any) => {
    const handler = (event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.SUBAGENT_UPDATE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SUBAGENT_UPDATE, handler);
  },
  
  applyHooksToConfig: (hooks: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.APPLY_HOOKS_TO_CONFIG, hooks),
  
  checkHooksConfigured: (hooks: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_HOOKS_CONFIGURED, hooks),
  
  checkCcusageAvailable: () => 
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_CCUSAGE_AVAILABLE),
  
  getUsageData: (options?: { raw?: boolean }) => 
    ipcRenderer.invoke(IPC_CHANNELS.GET_USAGE_DATA, options)
};

contextBridge.exposeInMainWorld('configAPI', configAPI);
