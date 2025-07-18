import React, { useState, useEffect } from 'react';
import { GroupedMCPConfiguration, MCPServerConfig } from '../../shared/types';
import { ServerCard } from './ServerCard';
import { Plus, Globe, FolderOpen, ChevronRight, ChevronDown, Home } from 'lucide-react';

interface GroupedConfigListProps {
  groupedConfig: GroupedMCPConfiguration;
  onConfigChange: (config: GroupedMCPConfiguration) => void;
}

export function GroupedConfigList({ groupedConfig, onConfigChange }: GroupedConfigListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [addingToProject, setAddingToProject] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState('');

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

  const handleUpdateProjectServer = (projectPath: string, oldName: string, newName: string, serverConfig: MCPServerConfig) => {
    const newConfig = { ...groupedConfig };
    if (!newConfig.projectServers[projectPath]) {
      newConfig.projectServers[projectPath] = {};
    }
    
    if (oldName !== newName) {
      delete newConfig.projectServers[projectPath][oldName];
    }
    newConfig.projectServers[projectPath][newName] = serverConfig;
    onConfigChange(newConfig);
  };

  const handleDeleteProjectServer = (projectPath: string, name: string) => {
    const newConfig = {
      ...groupedConfig,
      projectServers: {
        ...groupedConfig.projectServers,
        [projectPath]: { ...groupedConfig.projectServers[projectPath] }
      }
    };
    delete newConfig.projectServers[projectPath][name];
    
    // If no servers left in project, remove the project entry
    if (Object.keys(newConfig.projectServers[projectPath]).length === 0) {
      delete newConfig.projectServers[projectPath];
    }
    
    onConfigChange(newConfig);
  };

  const handleAddProjectServer = (projectPath: string) => {
    setIsAdding(true);
    setAddingToProject(projectPath);
  };

  const handleCreateNewProject = () => {
    if (!newProjectPath.trim()) return;
    
    // Normalize the path
    const normalizedPath = newProjectPath.trim().replace(/\\/g, '/');
    
    // Add the new project with empty servers
    const newConfig = {
      ...groupedConfig,
      projectServers: {
        ...groupedConfig.projectServers,
        [normalizedPath]: {}
      }
    };
    
    onConfigChange(newConfig);
    
    // Expand the new project and reset form
    const newExpanded = new Set(expandedProjects);
    newExpanded.add(normalizedPath);
    setExpandedProjects(newExpanded);
    setNewProjectPath('');
    setIsAddingProject(false);
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
          {/* Disabled for Claude Code - writing global config not supported yet */}
          {false && (
            <button
              onClick={handleAddGlobalServer}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Global
            </button>
          )}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-medium">Project-Specific Servers</h3>
          </div>
          <button
            onClick={() => setIsAddingProject(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {projectEntries.length === 0 && !isAddingProject && (
          <div className="text-center py-8 bg-secondary/20 rounded-lg ml-7">
            <p className="text-muted-foreground text-sm">No project-specific MCP servers configured</p>
          </div>
        )}

        {/* New Project Form */}
        {isAddingProject && (
          <div className="border rounded-lg p-4 ml-7 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Project Path</label>
              <input
                type="text"
                value={newProjectPath}
                onChange={(e) => setNewProjectPath(e.target.value)}
                placeholder="/path/to/your/project"
                className="w-full px-3 py-2 border rounded-md bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewProject();
                  } else if (e.key === 'Escape') {
                    setIsAddingProject(false);
                    setNewProjectPath('');
                  }
                }}
                autoFocus
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  Enter the full path to your project directory
                </p>
                <button
                  onClick={() => {
                    const platform = window.platformAPI?.platform || navigator.platform.toLowerCase();
                    if (platform === 'win32' || platform.includes('win')) {
                      setNewProjectPath('C:\\Users\\');
                    } else {
                      setNewProjectPath('/Users/');
                    }
                  }}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  type="button"
                >
                  <Home className="w-3 h-3" />
                  Use home directory
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAddingProject(false);
                  setNewProjectPath('');
                }}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewProject}
                disabled={!newProjectPath.trim()}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Project
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {projectEntries.map(([projectPath, servers]) => {
            const serverEntries = Object.entries(servers);
            const isExpanded = expandedProjects.has(projectPath);
            
            return (
              <div key={projectPath} className="border rounded-lg">
                <div className="flex items-center justify-between p-3">
                  <div
                    className="flex items-center gap-3 flex-1 hover:bg-muted/50 cursor-pointer transition-colors rounded"
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddProjectServer(projectPath);
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 transition-colors ml-2"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t px-3 py-3 space-y-3 bg-muted/20">
                    {serverEntries.map(([name, serverConfig]) => (
                      <div key={`${projectPath}-${name}`} className="ml-7">
                        <ServerCard
                          name={name}
                          config={serverConfig}
                          onUpdate={(newName, newConfig) => 
                            handleUpdateProjectServer(projectPath, name, newName, newConfig)
                          }
                          onDelete={() => handleDeleteProjectServer(projectPath, name)}
                        />
                      </div>
                    ))}
                    
                    {isAdding && addingToProject === projectPath && (
                      <div className="ml-7">
                        <ServerCard
                          name=""
                          config={{ command: '', args: [], env: {} }}
                          isNew
                          onUpdate={handleSaveNewServer}
                          onDelete={() => {
                            setIsAdding(false);
                            setAddingToProject(null);
                          }}
                        />
                      </div>
                    )}
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