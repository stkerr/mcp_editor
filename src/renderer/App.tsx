import React, { useState, useEffect } from 'react';
import { AppType, MCPConfiguration, ViewType, SubagentInfo } from '../shared/types';
import { ConfigList } from './components/ConfigList';
import { TabNavigation } from './components/TabNavigation';
import { SubagentMonitor } from './components/SubagentMonitor';

// Type augmentation for window
declare global {
  interface Window {
    configAPI: {
      loadConfig: (appType: AppType) => Promise<any>;
      saveConfig: (appType: AppType, config: MCPConfiguration) => Promise<any>;
      validateConfig: (config: MCPConfiguration) => Promise<any>;
      detectApps: () => Promise<any>;
      getSubagents: () => Promise<any>;
      saveSubagent: (subagent: SubagentInfo) => Promise<any>;
      clearSubagents: () => Promise<any>;
      onSubagentUpdate: (callback: (subagent: SubagentInfo) => void) => () => void;
    };
  }
}

function App() {
  const [selectedApp, setSelectedApp] = useState<AppType>('desktop');
  const [selectedView, setSelectedView] = useState<ViewType>('servers');
  const [config, setConfig] = useState<MCPConfiguration | null>(null);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      loadConfig();
    }
  }, [selectedApp]);

  const loadInitialData = async () => {
    try {
      const result = await window.configAPI.detectApps();
      if (result.success) {
        setAvailableApps(result.data);
        if (result.data.length > 0) {
          setSelectedApp(result.data[0] as AppType);
        }
      }
    } catch (err) {
      setError('Failed to detect installed applications');
    }
  };

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.configAPI.loadConfig(selectedApp);
      if (result.success) {
        setConfig(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (newConfig: MCPConfiguration) => {
    try {
      const result = await window.configAPI.saveConfig(selectedApp, newConfig);
      if (result.success) {
        setConfig(newConfig);
        // TODO: Show success toast
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to save configuration');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Draggable area for macOS */}
      <div className="draggable-header h-8 w-full fixed top-0 left-0 z-50" />
      
      <div className="container mx-auto p-6 max-w-6xl pt-14">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">MCP Configuration Manager</h1>
          <p className="text-muted-foreground">
            Manage your MCP server configurations for Claude Desktop and Claude Code
          </p>
        </header>

        {availableApps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No Claude applications detected on your system.
            </p>
            <p className="text-sm text-muted-foreground">
              Please install Claude Desktop or Claude Code to continue.
            </p>
          </div>
        ) : (
          <>
            <TabNavigation
              selectedApp={selectedApp}
              selectedView={selectedView}
              availableApps={availableApps}
              onAppChange={setSelectedApp}
              onViewChange={setSelectedView}
            />

            {selectedView === 'servers' ? (
              <>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="text-muted-foreground">Loading configuration...</div>
                  </div>
                ) : error ? (
                  <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
                    <p className="text-destructive">{error}</p>
                  </div>
                ) : config ? (
                  <ConfigList
                    config={config}
                    onConfigChange={saveConfig}
                  />
                ) : null}
              </>
            ) : selectedView === 'subagents' ? (
              <SubagentMonitor selectedApp={selectedApp} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
