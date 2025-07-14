import React, { useState, useEffect } from 'react';
import { SubagentInfo } from '../../shared/types';
import { Activity, Clock, CheckCircle, XCircle, Zap, Settings, Trash2, ChevronRight } from 'lucide-react';
import { HooksConfig } from './HooksConfig';
import { ErrorBoundary } from './ErrorBoundary';
import { SubagentDetailsModal } from './SubagentDetailsModal';

interface SubagentMonitorProps {
  refreshInterval?: number;
  selectedApp?: 'desktop' | 'code';
}

export function SubagentMonitor({ refreshInterval = 1000, selectedApp = 'code' }: SubagentMonitorProps) {
  const [subagents, setSubagents] = useState<SubagentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedSubagent, setSelectedSubagent] = useState<SubagentInfo | null>(null);

  useEffect(() => {
    loadSubagents();
    const interval = setInterval(loadSubagents, refreshInterval);
    
    // Set up real-time updates listener
    let unsubscribe: (() => void) | null = null;
    if (window.configAPI?.onSubagentUpdate) {
      unsubscribe = window.configAPI.onSubagentUpdate((newSubagent: SubagentInfo) => {
        setSubagents(prev => {
          // Remove any existing entry with the same ID and add the new one
          const filtered = prev.filter(s => s.id !== newSubagent.id);
          return [...filtered, newSubagent].sort((a, b) => 
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          );
        });
      });
    }
    
    return () => {
      clearInterval(interval);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshInterval]);

  const loadSubagents = async () => {
    try {
      if (window.configAPI?.getSubagents) {
        const result = await window.configAPI.getSubagents();
        if (result.success) {
          setSubagents(result.data);
        } else {
          setError(result.error);
        }
      } else {
        // For now, show empty state with setup instructions
        setSubagents([]);
      }
    } catch (err) {
      setError('Failed to load subagent data');
    } finally {
      setLoading(false);
    }
  };

  const clearSubagents = async () => {
    if (!window.confirm('Are you sure you want to clear all subagent data? This cannot be undone.')) {
      return;
    }
    
    try {
      if (window.configAPI?.clearSubagents) {
        const result = await window.configAPI.clearSubagents();
        if (result.success) {
          setSubagents([]);
          // Show success feedback (in a real app, you'd use a toast)
          console.log('Subagent data cleared successfully');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('Failed to clear subagent data');
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end ? new Date(end) : new Date();
    const duration = endTime.getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStatusIcon = (status: SubagentInfo['status']) => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4 text-green-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: SubagentInfo['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Show message if not using Claude Code
  if (selectedApp !== 'code') {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Subagent Monitoring for Claude Code</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          This feature monitors subagent activity in Claude Code. 
          Please switch to Claude Code using the app selector above to configure and use this feature.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-sm mx-auto">
          <p className="text-sm text-amber-800">
            👆 Click "Claude Code" button above to switch apps
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-muted-foreground">Loading subagent data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
        <p className="text-destructive mb-2">{error}</p>
        <button 
          onClick={loadSubagents}
          className="text-sm underline text-destructive hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (subagents.length === 0) {
    if (showSetup) {
      return (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium">Configure Subagent Monitoring</h3>
            <button
              onClick={() => setShowSetup(false)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              ← Back to overview
            </button>
          </div>
          <ErrorBoundary>
            <HooksConfig />
          </ErrorBoundary>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Subagent Activity</h3>
        <p className="text-muted-foreground mb-6">
          Configure Claude Code hooks to monitor subagent activity here.
        </p>
        
        <div className="flex gap-3 justify-center mb-6">
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure Hooks
          </button>
        </div>

        <div className="bg-muted rounded-lg p-4 text-left max-w-md mx-auto">
          <h4 className="font-medium mb-2">Quick Setup:</h4>
          <ol className="text-sm space-y-1 text-muted-foreground">
            <li>1. Click "Configure Hooks" above</li>
            <li>2. Copy the generated configuration</li>
            <li>3. Add it to your Claude Code settings</li>
            <li>4. Restart Claude Code</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Subagent Activity</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4" />
            Auto-refreshing every {refreshInterval / 1000}s
          </div>
          <button
            onClick={clearSubagents}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors"
            title="Clear all subagent data"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {subagents
          .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
          .map((subagent) => (
          <div 
            key={subagent.id} 
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => setSelectedSubagent(subagent)}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(subagent.status)}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">
                  {subagent.description || `Subagent ${subagent.id.substring(0, 8)}`}
                </h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(subagent.status)}`}>
                  {subagent.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(subagent.startTime)}
                </span>
                <span className="font-mono">
                  {formatDuration(subagent.startTime, subagent.endTime)}
                </span>
              </div>
            </div>

            {/* Action Indicator */}
            <div className="flex-shrink-0">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {selectedSubagent && (
        <SubagentDetailsModal
          subagent={selectedSubagent}
          onClose={() => setSelectedSubagent(null)}
        />
      )}
    </div>
  );
}
