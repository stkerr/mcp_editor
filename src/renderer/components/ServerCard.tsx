import React, { useState, useId } from 'react';
import { MCPServerConfig } from '../../shared/types';
import { Edit2, Trash2, Save, X, Plus, Minus } from 'lucide-react';

interface ServerCardProps {
  name: string;
  config: MCPServerConfig;
  isNew?: boolean;
  onUpdate: (name: string, config: MCPServerConfig) => void;
  onDelete: () => void;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
}

export function ServerCard({ name, config, isNew = false, onUpdate, onDelete }: ServerCardProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [editName, setEditName] = useState(name);
  const [editConfig, setEditConfig] = useState<MCPServerConfig>(config);
  
  // Convert env object to array with stable IDs
  const [envVars, setEnvVars] = useState<EnvVar[]>(() => 
    Object.entries(config.env || {}).map(([key, value]) => ({
      id: Math.random().toString(36).substr(2, 9),
      key,
      value
    }))
  );

  const handleSave = () => {
    if (!editName.trim()) {
      alert('Server name is required');
      return;
    }
    if (!editConfig.command.trim()) {
      alert('Command is required');
      return;
    }
    
    // Convert envVars array back to object
    const envObject: Record<string, string> = {};
    envVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envObject[key] = value;
      }
    });
    
    onUpdate(editName, { ...editConfig, env: envObject });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (isNew) {
      onDelete();
    } else {
      setEditName(name);
      setEditConfig(config);
      setEnvVars(Object.entries(config.env || {}).map(([key, value]) => ({
        id: Math.random().toString(36).substr(2, 9),
        key,
        value
      })));
      setIsEditing(false);
    }
  };

  const addArg = () => {
    setEditConfig({
      ...editConfig,
      args: [...(editConfig.args || []), '']
    });
  };

  const updateArg = (index: number, value: string) => {
    const newArgs = [...(editConfig.args || [])];
    newArgs[index] = value;
    setEditConfig({ ...editConfig, args: newArgs });
  };

  const removeArg = (index: number) => {
    const newArgs = [...(editConfig.args || [])];
    newArgs.splice(index, 1);
    setEditConfig({ ...editConfig, args: newArgs });
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, {
      id: Math.random().toString(36).substr(2, 9),
      key: '',
      value: ''
    }]);
  };

  const updateEnvVar = (id: string, field: 'key' | 'value', newValue: string) => {
    setEnvVars(envVars.map(envVar => 
      envVar.id === id ? { ...envVar, [field]: newValue } : envVar
    ));
  };

  const removeEnvVar = (id: string) => {
    setEnvVars(envVars.filter(envVar => envVar.id !== id));
  };

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Server Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="my-mcp-server"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Command</label>
          <input
            type="text"
            value={editConfig.command}
            onChange={(e) => setEditConfig({ ...editConfig, command: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="node"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Arguments</label>
            <button
              onClick={addArg}
              className="text-sm flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <Plus className="w-3 h-3" /> Add Argument
            </button>
          </div>
          {editConfig.args?.map((arg, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={arg}
                onChange={(e) => updateArg(index, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background"
                placeholder="Argument value"
              />
              <button
                onClick={() => removeArg(index)}
                className="p-2 text-destructive hover:text-destructive/80"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">Environment Variables</label>
            <button
              onClick={addEnvVar}
              className="text-sm flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <Plus className="w-3 h-3" /> Add Variable
            </button>
          </div>
          {envVars.map((envVar) => (
            <div key={envVar.id} className="flex gap-2 mb-2">
              <input
                type="text"
                value={envVar.key}
                onChange={(e) => updateEnvVar(envVar.id, 'key', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background"
                placeholder="Variable name"
              />
              <input
                type="text"
                value={envVar.value}
                onChange={(e) => updateEnvVar(envVar.id, 'value', e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background"
                placeholder="Variable value"
              />
              <button
                onClick={() => removeEnvVar(envVar.id)}
                className="p-2 text-destructive hover:text-destructive/80"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium mb-2">{name}</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Command:</span>{' '}
              <code className="bg-secondary px-2 py-0.5 rounded break-all">{config.command}</code>
            </div>
            {config.args && config.args.length > 0 && (
              <div>
                <span className="text-muted-foreground">Arguments:</span>{' '}
                {config.args.map((arg, i) => (
                  <code key={i} className="bg-secondary px-2 py-0.5 rounded mr-1 inline-block mb-1 break-all">
                    {arg}
                  </code>
                ))}
              </div>
            )}
            {config.env && Object.keys(config.env).length > 0 && (
              <div>
                <span className="text-muted-foreground">Environment:</span>{' '}
                <div className="mt-1">
                  {Object.entries(config.env).map(([key, value]) => (
                    <code key={key} className="bg-secondary px-2 py-0.5 rounded mr-1 mb-1 inline-block break-all">
                      {key}={value}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-muted-foreground hover:text-foreground"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-destructive hover:text-destructive/80"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
