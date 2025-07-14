import React, { useState } from 'react';
import { MCPConfiguration, MCPServerConfig } from '../../shared/types';
import { ServerCard } from './ServerCard';
import { Plus } from 'lucide-react';

interface ConfigListProps {
  config: MCPConfiguration;
  onConfigChange: (config: MCPConfiguration) => void;
}

export function ConfigList({ config, onConfigChange }: ConfigListProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddServer = () => {
    setIsAdding(true);
  };

  const handleSaveNewServer = (name: string, serverConfig: MCPServerConfig) => {
    const newConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [name]: serverConfig
      }
    };
    onConfigChange(newConfig);
    setIsAdding(false);
  };

  const handleUpdateServer = (oldName: string, newName: string, serverConfig: MCPServerConfig) => {
    const newConfig = { ...config };
    if (oldName !== newName) {
      delete newConfig.mcpServers[oldName];
    }
    newConfig.mcpServers[newName] = serverConfig;
    onConfigChange(newConfig);
  };

  const handleDeleteServer = (name: string) => {
    const newConfig = {
      ...config,
      mcpServers: { ...config.mcpServers }
    };
    delete newConfig.mcpServers[name];
    onConfigChange(newConfig);
  };

  const serverEntries = Object.entries(config.mcpServers || {});

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">MCP Servers</h2>
        <button
          onClick={handleAddServer}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>

      {serverEntries.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-secondary/20 rounded-lg">
          <p className="text-muted-foreground mb-2">No MCP servers configured</p>
          <p className="text-sm text-muted-foreground">Click "Add Server" to get started</p>
        </div>
      )}

      <div className="space-y-4">
        {serverEntries.map(([name, serverConfig]) => (
          <ServerCard
            key={name}
            name={name}
            config={serverConfig}
            onUpdate={(newName, newConfig) => handleUpdateServer(name, newName, newConfig)}
            onDelete={() => handleDeleteServer(name)}
          />
        ))}

        {isAdding && (
          <ServerCard
            name=""
            config={{ command: '', args: [], env: {} }}
            isNew
            onUpdate={handleSaveNewServer}
            onDelete={() => setIsAdding(false)}
          />
        )}
      </div>
    </div>
  );
}
