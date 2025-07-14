import React from 'react';
import { X, Download, Clock, Hash, FileText, Activity, Code } from 'lucide-react';
import { SubagentInfo } from '../../shared/types';

interface SubagentDetailsModalProps {
  subagent: SubagentInfo;
  onClose: () => void;
}

export function SubagentDetailsModal({ subagent, onClose }: SubagentDetailsModalProps) {
  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const downloadOutput = () => {
    if (!subagent.output) return;
    
    const blob = new Blob([subagent.output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subagent-${subagent.id}-output.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const calculateActualDuration = () => {
    if (subagent.startTime && subagent.endTime) {
      const start = new Date(subagent.startTime).getTime();
      const end = new Date(subagent.endTime).getTime();
      return end - start;
    }
    return undefined;
  };

  const actualDuration = calculateActualDuration();

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{subagent.description || 'Subagent Details'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Session ID</h3>
              <p className="text-sm font-mono">{subagent.sessionId}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Status</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                subagent.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : subagent.status === 'completed'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {subagent.status}
              </span>
            </div>
          </div>

          {/* Duration and Performance */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration & Performance
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Actual Duration</p>
                <p className="text-lg font-semibold">{formatDuration(actualDuration)}</p>
              </div>
              {subagent.totalDurationMs && (
                <div>
                  <p className="text-sm text-muted-foreground">Reported Duration</p>
                  <p className="text-lg font-semibold">{formatDuration(subagent.totalDurationMs)}</p>
                </div>
              )}
              {subagent.toolUseCount !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">Tool Uses</p>
                  <p className="text-lg font-semibold">{subagent.toolUseCount}</p>
                </div>
              )}
            </div>
          </div>

          {/* Token Usage */}
          {(subagent.totalTokens !== undefined || subagent.inputTokens !== undefined) && (
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Token Usage
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {subagent.totalTokens !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-semibold">{subagent.totalTokens.toLocaleString()}</p>
                  </div>
                )}
                {subagent.inputTokens !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Input</p>
                    <p className="text-lg font-semibold">{subagent.inputTokens.toLocaleString()}</p>
                  </div>
                )}
                {subagent.outputTokens !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Output</p>
                    <p className="text-lg font-semibold">{subagent.outputTokens.toLocaleString()}</p>
                  </div>
                )}
                {subagent.cacheReadTokens !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cache Read</p>
                    <p className="text-lg font-semibold">{subagent.cacheReadTokens.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tools Used */}
          {subagent.toolsUsed.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Tools Used
              </h3>
              <div className="flex flex-wrap gap-2">
                {subagent.toolsUsed.map((tool, index) => (
                  <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tool Input */}
          {subagent.toolInput && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Tool Input
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {typeof subagent.toolInput === 'object' 
                    ? JSON.stringify(subagent.toolInput, null, 2)
                    : subagent.toolInput}
                </pre>
              </div>
            </div>
          )}

          {/* Output */}
          {subagent.output && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Output Log
                </h3>
                <button
                  onClick={downloadOutput}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono">{subagent.output}</pre>
              </div>
            </div>
          )}

          {/* Transcript Path */}
          {subagent.transcriptPath && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Transcript Path</h3>
              <p className="text-sm font-mono break-all">{subagent.transcriptPath}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}