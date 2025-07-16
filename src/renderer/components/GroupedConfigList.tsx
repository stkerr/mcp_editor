import React, { useState } from 'react';
import { GroupedMCPConfiguration, MCPServerConfig } from '../../shared/types';
import { ServerCard } from './ServerCard';
import { Plus, Globe, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

interface GroupedConfigListProps {
  groupedConfig: GroupedMCPConfiguration;
  onConfigChange: (config: GroupedMCPConfiguration) => void;
}

export function GroupedConfigList({ groupedConfig, onConfigChange }: GroupedConfigListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [addingToProject, setAddingToProject] = useState<string | null>(null);

  const toggleProject = (projectPath: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectPath)) {
      newExpanded.delete(projectPath);
    } else {
      newExpanded.add(projectPath);
    }
    setExpandedProjects(newExpanded);
  };

  const handleAddGlobalServer = () => {
    setIsAdding(true);
    setAddingToProject(null);
  };

  const handleSaveNewServer = (name: string, serverConfig: MCPServerConfig) => {
    if (addingToProject) {
      // Adding to a specific project
      const newConfig = {
        ...groupedConfig,
        projectServers: {
          ...groupedConfig.projectServers,
          [addingToProject]: {
            ...groupedConfig.projectServers[addingToProject],
            [name]: serverConfig
          }
        }
      };
      onConfigChange(newConfig);
    } else {
      // Adding globally
      const newConfig = {
        ...groupedConfig,
        globalServers: {
          ...groupedConfig.globalServers,
          [name]: serverConfig
        }
      };
      onConfigChange(newConfig);
    }
    setIsAdding(false);
    setAddingToProject(null);
  };

  const handleUpdateGlobalServer = (oldName: string, newName: string, serverConfig: MCPServerConfig) => {
    const newConfig = { ...groupedConfig };
    if (oldName !== newName) {
      delete newConfig.globalServers[oldName];
    }
    newConfig.globalServers[newName] = serverConfig;
    onConfigChange(newConfig);
  };

  const handleDeleteGlobalServer = (name: string) => {
    const newConfig = {
      ...groupedConfig,
      globalServers: { ...groupedConfig.globalServers }
    };
    delete newConfig.globalServers[name];
    onConfigChange(newConfig);
  };

  const globalServerEntries = Object.entries(groupedConfig.globalServers || {});
  const projectEntries = Object.entries(groupedConfig.projectServers || {});

  // Count total servers
  const totalGlobalServers = globalServerEntries.length;
  const totalProjectServers = projectEntries.reduce((acc, [_, servers]) => 
    acc + Object.keys(servers).length, 0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">MCP Servers</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{totalGlobalServers} global</span>
          <span>{totalProjectServers} project-specific</span>
          <span className="font-semibold">{totalGlobalServers + totalProjectServers} total</span>
        </div>
      </div>

      {/* Global Servers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium">Global Servers</h3>
            <span className="text-sm text-muted-foreground">
              (Available in all projects)
            </span>
          </div>
          <button
            onClick={handleAddGlobalServer}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Global
          </button>
        </div>

        {globalServerEntries.length === 0 && !isAdding && (
          <div className="text-center py-8 bg-secondary/20 rounded-lg ml-7">
            <p className="text-muted-foreground text-sm">No global MCP servers configured</p>
          </div>
        )}

        <div className="space-y-3 ml-7">
          {globalServerEntries.map(([name, serverConfig]) => (
            <ServerCard
              key={`global-${name}`}
              name={name}
              config={serverConfig}
              onUpdate={(newName, newConfig) => handleUpdateGlobalServer(name, newName, newConfig)}
              onDelete={() => handleDeleteGlobalServer(name)}
            />
          ))}

          {isAdding && !addingToProject && (
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

      {/* Project-Specific Servers Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-medium">Project-Specific Servers</h3>
        </div>

        {projectEntries.length === 0 && (
          <div className="text-center py-8 bg-secondary/20 rounded-lg ml-7">
            <p className="text-muted-foreground text-sm">No project-specific MCP servers configured</p>
          </div>
        )}

        <div className="space-y-2">
          {projectEntries.map(([projectPath, servers]) => {
            const serverEntries = Object.entries(servers);
            const isExpanded = expandedProjects.has(projectPath);
            
            return (
              <div key={projectPath} className="border rounded-lg">
                <div
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => toggleProject(projectPath)}
                >
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{projectPath}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {serverEntries.length} server{serverEntries.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {isExpanded && (
                  <div className="border-t px-3 py-3 space-y-3 bg-muted/20">
                    {serverEntries.map(([name, serverConfig]) => (
                      <div key={`${projectPath}-${name}`} className="ml-7">
                        <ServerCard
                          name={name}
                          config={serverConfig}
                          onUpdate={() => {
                            // For now, editing project-specific servers is read-only
                            console.warn('Editing project-specific servers not yet implemented');
                          }}
                          onDelete={() => {
                            console.warn('Deleting project-specific servers not yet implemented');
                          }}
                          readOnly
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}