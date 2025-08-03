import React from 'react';
import { AppType, ViewType } from '../../shared/types';

interface TabNavigationProps {
  selectedApp: AppType;
  selectedView: ViewType;
  availableApps: string[];
  onAppChange: (app: AppType) => void;
  onViewChange: (view: ViewType) => void;
}

export function TabNavigation({ 
  selectedApp, 
  selectedView, 
  availableApps, 
  onAppChange, 
  onViewChange 
}: TabNavigationProps) {
  // Only show subagent monitor and features for Claude Code
  const views: { id: ViewType; label: string; description: string }[] = selectedApp === 'code' ? [
    { id: 'servers', label: 'MCP Servers', description: 'Configure MCP server connections' },
    { id: 'subagents', label: 'Subagent Monitor', description: 'Monitor Claude Code subagent activity' },
    { id: 'claude-code-features', label: 'Claude Code', description: 'Additional Claude Code features and tools' }
  ] : [
    { id: 'servers', label: 'MCP Servers', description: 'Configure MCP server connections' }
  ];

  return (
    <div className="mb-6">
      {/* App Selection and Usage */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {availableApps.includes('desktop') && (
            <button
              onClick={() => {
                onAppChange('desktop');
                if (selectedView === 'usage') {
                  onViewChange('servers');
                }
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedApp === 'desktop' && selectedView !== 'usage'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Claude Desktop
            </button>
          )}
          {availableApps.includes('code') && (
            <button
              onClick={() => {
                onAppChange('code');
                if (selectedView === 'usage') {
                  onViewChange('servers');
                }
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedApp === 'code' && selectedView !== 'usage'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Claude Code
            </button>
          )}
        </div>
        
        {/* Usage button */}
        <button
          onClick={() => onViewChange('usage')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedView === 'usage'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Usage
        </button>
      </div>

      {/* View Selection Tabs - only show if not on usage view */}
      {selectedView !== 'usage' && (
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={`relative py-3 px-1 text-sm font-medium transition-colors hover:text-primary ${
                  selectedView === view.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {view.label}
                {selectedView === view.id && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* View Description */}
      <div className="mt-2 text-sm text-muted-foreground">
        {selectedView === 'usage' 
          ? 'View your Claude usage statistics and costs' 
          : views.find(v => v.id === selectedView)?.description}
      </div>
    </div>
  );
}