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
  // Only show subagent monitor for Claude Code
  const views: { id: ViewType; label: string; description: string }[] = selectedApp === 'code' ? [
    { id: 'servers', label: 'MCP Servers', description: 'Configure MCP server connections' },
    { id: 'subagents', label: 'Subagent Monitor', description: 'Monitor Claude Code subagent activity' }
  ] : [
    { id: 'servers', label: 'MCP Servers', description: 'Configure MCP server connections' }
  ];

  return (
    <div className="mb-6">
      {/* App Selection */}
      <div className="flex gap-2 mb-4">
        {availableApps.includes('desktop') && (
          <button
            onClick={() => onAppChange('desktop')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedApp === 'desktop'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Claude Desktop
          </button>
        )}
        {availableApps.includes('code') && (
          <button
            onClick={() => onAppChange('code')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedApp === 'code'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Claude Code
          </button>
        )}
      </div>

      {/* View Selection Tabs */}
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

      {/* View Description */}
      <div className="mt-2 text-sm text-muted-foreground">
        {views.find(v => v.id === selectedView)?.description}
      </div>
    </div>
  );
}