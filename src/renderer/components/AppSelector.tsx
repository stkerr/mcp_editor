import React from 'react';
import { AppType } from '../../shared/types';

interface AppSelectorProps {
  selectedApp: AppType;
  availableApps: string[];
  onAppChange: (app: AppType) => void;
}

export function AppSelector({ selectedApp, availableApps, onAppChange }: AppSelectorProps) {
  return (
    <div className="mb-6 flex gap-2">
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
  );
}
