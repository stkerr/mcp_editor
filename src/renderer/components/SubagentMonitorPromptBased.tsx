import React, { useState, useEffect } from 'react';
import { SubagentInfo } from '../../shared/types';
import { Activity, Clock, CheckCircle, XCircle, Zap, Settings, Trash2, ChevronRight, ChevronDown, MessageSquare, FileText } from 'lucide-react';
import { HooksConfig } from './HooksConfig';
import { ErrorBoundary } from './ErrorBoundary';
import { SubagentDetailsModal } from './SubagentDetailsModal';
import { buildPromptHierarchy, PromptInfo, PromptTreeNode, TaskGroupNode, formatPromptDuration } from '../utils/prompt-hierarchy';
import { IPC_CHANNELS } from '../../shared/constants';

// Type augmentation for window
declare global {
  interface Window {
    electronAPI?: {
      receive: (channel: string, callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

interface SubagentMonitorProps {
  refreshInterval?: number;
  selectedApp?: 'desktop' | 'code';
}

export function SubagentMonitor({ refreshInterval = 1000, selectedApp = 'code' }: SubagentMonitorProps) {
  const [subagents, setSubagents] = useState<SubagentInfo[]>([]);
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedSubagent, setSelectedSubagent] = useState<SubagentInfo | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  console.log('SubagentMonitor render:', { selectedApp, loading, error, subagents: subagents.length });

  useEffect(() => {
    loadSubagents();
    const interval = setInterval(loadSubagents, refreshInterval);
    
    // Set up real-time updates listener
    let unsubscribeSubagent: (() => void) | null = null;
    let unsubscribePrompt: (() => void) | null = null;
    
    if (window.configAPI?.onSubagentUpdate) {
      unsubscribeSubagent = window.configAPI.onSubagentUpdate((newSubagent: SubagentInfo) => {
        setSubagents(prev => {
          // Remove any existing entry with the same ID and add the new one
          const filtered = prev.filter(s => s.id !== newSubagent.id);
          return [...filtered, newSubagent].sort((a, b) => 
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          );
        });
      });
    }
    
    // Listen for prompt updates
    if (window.electronAPI && (window.electronAPI as any).receive) {
      const receiveAPI = (window.electronAPI as any).receive;
      receiveAPI(IPC_CHANNELS.PROMPT_UPDATE, (data: any) => {
        if (data.type === 'new') {
          const newPrompt: PromptInfo = {
            promptId: data.promptId,
            promptText: data.promptText,
            sessionId: data.sessionId,
            startTime: new Date(data.timestamp),
            status: 'active'
          };
          
          setPrompts(prev => {
            // Check if there's an existing active prompt for this session
            const existingPromptIndex = prev.findIndex(p => 
              p.sessionId === data.sessionId && p.status === 'active'
            );
            
            if (existingPromptIndex !== -1) {
              // Mark the existing prompt as interrupted
              const updated = [...prev];
              updated[existingPromptIndex] = {
                ...updated[existingPromptIndex],
                status: 'interrupted'
              };
              return [...updated, newPrompt];
            }
            
            return [...prev, newPrompt];
          });
        } else if (data.type === 'completed') {
          // Update prompt status to completed
          setPrompts(prev => {
            const promptIndex = prev.findIndex(p => p.promptId === data.promptId);
            if (promptIndex !== -1) {
              const updated = [...prev];
              updated[promptIndex] = {
                ...updated[promptIndex],
                status: 'completed',
                duration: new Date(data.timestamp).getTime() - new Date(updated[promptIndex].startTime).getTime()
              };
              return updated;
            }
            return prev;
          });
        }
      });
      
      unsubscribePrompt = () => {
        if (window.electronAPI && (window.electronAPI as any).removeAllListeners) {
          (window.electronAPI as any).removeAllListeners(IPC_CHANNELS.PROMPT_UPDATE);
        }
      };
    }
    
    return () => {
      clearInterval(interval);
      if (unsubscribeSubagent) {
        unsubscribeSubagent();
      }
      if (unsubscribePrompt) {
        unsubscribePrompt();
      }
    };
  }, [refreshInterval]);

  const loadSubagents = async () => {
    console.log('loadSubagents called, window.configAPI:', window.configAPI);
    try {
      if (window.configAPI?.getSubagents) {
        const result = await window.configAPI.getSubagents();
        console.log('getSubagents result:', result);
        if (result.success) {
          setSubagents(result.data);
        } else {
          setError(result.error);
        }
      } else {
        console.log('window.configAPI.getSubagents not available');
        // For now, show empty state with setup instructions
        setSubagents([]);
      }
      
      // Also load prompts
      if (window.configAPI?.getPrompts) {
        const promptResult = await window.configAPI.getPrompts();
        console.log('getPrompts result:', promptResult);
        if (promptResult.success) {
          setPrompts(promptResult.data || []);
        }
      }
    } catch (err) {
      console.error('Error in loadSubagents:', err);
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
          setPrompts([]);
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

  const getStatusIcon = (status: SubagentInfo['status'] | PromptInfo['status']) => {
    switch (status) {
      case 'active':
        return <Activity className="w-4 h-4 text-green-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'interrupted':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      case '':
        return null; // No icon for empty status
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: SubagentInfo['status'] | PromptInfo['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'interrupted':
        return 'text-orange-600 bg-orange-100';
      case '':
        return ''; // No color for empty status
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Show message if not using Claude Code
  if (selectedApp !== 'code') {
    console.log('SubagentMonitor: Not Claude Code app, showing message');
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
    console.log('SubagentMonitor: Loading state');
    return (
      <div className="flex justify-center py-12">
        <div className="text-muted-foreground">Loading subagent data...</div>
      </div>
    );
  }

  if (error) {
    console.log('SubagentMonitor: Error state:', error);
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


  // Function to render task groups (grouped by description)
  const renderTaskGroups = (taskGroups: TaskGroupNode[], promptId: string): React.ReactNode => {
    return taskGroups.map(({ taskGroup, expanded }) => {
      const taskKey = `${promptId}-task-${taskGroup.description}`;
      const hasMultipleEvents = taskGroup.events.length > 1;
      
      return (
        <div key={taskKey} className="ml-8 space-y-1">
          {/* Task Group Header */}
          <div 
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => {
              if (hasMultipleEvents) {
                const newExpanded = new Set(expandedNodes);
                if (newExpanded.has(taskKey)) {
                  newExpanded.delete(taskKey);
                } else {
                  newExpanded.add(taskKey);
                }
                setExpandedNodes(newExpanded);
              } else {
                // If single event, show details directly
                setSelectedSubagent(taskGroup.events[0]);
              }
            }}
          >
            {/* Expand/Collapse Icon (only if multiple events) */}
            {hasMultipleEvents && (
              <div className="flex-shrink-0">
                {expandedNodes.has(taskKey) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            )}

            {/* Status Icon */}
            {getStatusIcon(taskGroup.status) && (
              <div className="flex-shrink-0">
                {getStatusIcon(taskGroup.status)}
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">
                  {taskGroup.description}
                </h4>
                {taskGroup.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(taskGroup.status)}`}>
                    {taskGroup.status}
                  </span>
                )}
                {hasMultipleEvents && (
                  <span className="text-xs text-muted-foreground">
                    ({taskGroup.events.length} events)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(taskGroup.startTime)}
                </span>
                <span className="font-mono">
                  {formatDuration(taskGroup.startTime, taskGroup.endTime)}
                </span>
                {taskGroup.totalTokens && (
                  <span>
                    {taskGroup.totalTokens} tokens
                  </span>
                )}
              </div>
            </div>

            {/* Action Indicator */}
            <div className="flex-shrink-0">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Individual Events (when expanded) */}
          {hasMultipleEvents && expandedNodes.has(taskKey) && (
            <div className="ml-8 space-y-2">
              {taskGroup.events.map(event => (
                <div 
                  key={event.id}
                  className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors text-sm"
                  onClick={() => setSelectedSubagent(event)}
                >
                  {getStatusIcon(event.status) && (
                    <div className="flex-shrink-0">
                      {getStatusIcon(event.status)}
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-muted-foreground">
                      {event.status === 'active' ? 'Started' : event.status === 'completed' ? 'Completed' : 'Event'} at {formatTime(event.startTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  if (subagents.length === 0) {
    console.log('SubagentMonitor: No subagents, showSetup:', showSetup);
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

  // Build the prompt hierarchy
  const promptHierarchy = buildPromptHierarchy(subagents, prompts, expandedNodes);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Subagent Activity</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4" />
            Auto-refreshing every {refreshInterval / 1000}s
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const allPromptIds = promptHierarchy.map(node => node.prompt.promptId);
                const expandedPromptCount = allPromptIds.filter(id => expandedNodes.has(id)).length;
                
                if (expandedPromptCount === allPromptIds.length) {
                  // All expanded, collapse all
                  setExpandedNodes(new Set());
                } else {
                  // Some collapsed, expand all prompts (not individual nodes)
                  setExpandedNodes(new Set(allPromptIds));
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              title="Expand/Collapse all prompts"
            >
              {(() => {
                const allPromptIds = promptHierarchy.map(node => node.prompt.promptId);
                const expandedPromptCount = allPromptIds.filter(id => expandedNodes.has(id)).length;
                return expandedPromptCount === allPromptIds.length;
              })() ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Expand All
                </>
              )}
            </button>
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
      </div>

      <div className="space-y-2">
        {promptHierarchy.map((promptNode) => (
          <div key={promptNode.prompt.promptId} className="space-y-1">
            {/* Prompt Header */}
            <div 
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => {
                const newExpanded = new Set(expandedNodes);
                if (newExpanded.has(promptNode.prompt.promptId)) {
                  newExpanded.delete(promptNode.prompt.promptId);
                } else {
                  newExpanded.add(promptNode.prompt.promptId);
                }
                setExpandedNodes(newExpanded);
              }}
            >
              {/* Expand/Collapse Icon */}
              <div className="flex-shrink-0">
                {expandedNodes.has(promptNode.prompt.promptId) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Prompt Icon */}
              <div className="flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm truncate">
                    {promptNode.prompt.promptText}
                  </h4>
                  <div className="flex items-center gap-1">
                    {promptNode.prompt.status === 'active' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(promptNode.prompt.status)}`}>
                        active
                      </span>
                    )}
                    {promptNode.prompt.status === 'interrupted' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(promptNode.prompt.status)}`}>
                        interrupted
                      </span>
                    )}
                    {promptNode.activeCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-green-600 bg-green-100">
                        {promptNode.activeCount} active
                      </span>
                    )}
                    {promptNode.completedCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-blue-600 bg-blue-100">
                        {promptNode.completedCount} done
                      </span>
                    )}
                    {promptNode.failedCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-red-600 bg-red-100">
                        {promptNode.failedCount} failed
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(promptNode.prompt.startTime)}
                  </span>
                  {promptNode.prompt.duration && (
                    <span className="font-mono">
                      {formatPromptDuration(promptNode.prompt)}
                    </span>
                  )}
                  {promptNode.prompt.totalTokens && (
                    <span>
                      {promptNode.prompt.totalTokens} tokens
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Events list (when expanded) */}
            {expandedNodes.has(promptNode.prompt.promptId) && (
              <div className="space-y-2">
                {/* Render task groups */}
                {renderTaskGroups(promptNode.taskGroups, promptNode.prompt.promptId)}
              </div>
            )}
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