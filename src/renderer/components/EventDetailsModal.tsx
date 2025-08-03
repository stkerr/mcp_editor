import React, { useState, useEffect } from 'react';
import { SessionNode, ClaudeCodeEventType } from '../../shared/claudeCodeTypes';
import { 
  EVENT_TYPE_ICONS, 
  EVENT_TYPE_COLORS, 
  getEventDescription,
  formatDuration 
} from '../utils/claudeCodeUIHelpers';

interface EventDetailsModalProps {
  eventId: string | null;
  dagState: any; // DAGStateResponse['data']
  onClose: () => void;
}

interface TabType {
  id: 'overview' | 'raw-data' | 'performance';
  label: string;
  icon: string;
}

const TABS: TabType[] = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'raw-data', label: 'Raw Data', icon: '🔍' },
  { id: 'performance', label: 'Performance', icon: '📊' }
];

export function EventDetailsModal({ eventId, dagState, onClose }: EventDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType['id']>('overview');
  const [eventData, setEventData] = useState<SessionNode | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<{
    parent: SessionNode | null;
    children: SessionNode[];
    siblings: SessionNode[];
  }>({ parent: null, children: [], siblings: [] });

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find event data and relationships
  useEffect(() => {
    if (!eventId || !dagState) {
      setEventData(null);
      return;
    }

    // Find the event in the DAG state
    let foundEvent: SessionNode | null = null;
    let allSessionNodes: SessionNode[] = [];

    for (const session of Object.values(dagState.sessions || {})) {
      const sessionNodes = (session as any).nodes.map((node: any) => ({
        ...node,
        timeReceived: new Date(node.timeReceived),
        eventType: node.eventType as ClaudeCodeEventType
      }));
      
      allSessionNodes.push(...sessionNodes);
      
      const found = sessionNodes.find((node: SessionNode) => node.id === eventId);
      if (found) {
        foundEvent = found;
      }
    }

    if (!foundEvent) {
      setEventData(null);
      return;
    }

    setEventData(foundEvent);

    // Find related events
    const sessionNodes = allSessionNodes.filter(node => node.sessionId === foundEvent!.sessionId);
    
    const parent = foundEvent.parentId 
      ? sessionNodes.find(node => node.id === foundEvent!.parentId) || null
      : null;
    
    const children = sessionNodes.filter(node => node.parentId === foundEvent!.id);
    
    const siblings = foundEvent.parentId
      ? sessionNodes.filter(node => 
          node.parentId === foundEvent!.parentId && node.id !== foundEvent!.id
        )
      : [];

    setRelatedEvents({ parent, children, siblings });
  }, [eventId, dagState]);

  if (!eventId || !dagState || !eventData) {
    return null;
  }

  const icon = EVENT_TYPE_ICONS[eventData.eventType];
  const colors = EVENT_TYPE_COLORS[eventData.eventType];
  const description = getEventDescription(eventData);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const hasPerformanceData = () => {
    const rawBody = eventData.rawBody;
    return rawBody && (
      rawBody.totalDurationMs ||
      rawBody.totalTokens ||
      rawBody.inputTokens ||
      rawBody.outputTokens ||
      rawBody.cacheCreationTokens ||
      rawBody.cacheReadTokens ||
      rawBody.toolUseCount
    );
  };

  const renderRelatedEventLink = (event: SessionNode, label: string) => (
    <div 
      key={event.id}
      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => {
        // This would navigate to the related event
        // For now, we'll just copy the ID
        copyToClipboard(event.id);
      }}
    >
      <span className="text-sm">{EVENT_TYPE_ICONS[event.eventType]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}: {event.eventType}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
          {event.id}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(event.id);
        }}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="Copy ID"
      >
        📋
      </button>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Event ID:</span>
              <button
                onClick={() => copyToClipboard(eventData.id)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy ID"
              >
                📋
              </button>
            </div>
            <div className="font-mono text-xs mt-1 break-all">{eventData.id}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Session ID:</span>
              <button
                onClick={() => copyToClipboard(eventData.sessionId)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy ID"
              >
                📋
              </button>
            </div>
            <div className="font-mono text-xs mt-1 break-all">{eventData.sessionId}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Time Received:</span>
            <div className="mt-1 font-mono text-xs">{formatTimestamp(eventData.timeReceived)}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Parent ID:</span>
              {eventData.parentId && (
                <button
                  onClick={() => copyToClipboard(eventData.parentId!)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Copy ID"
                >
                  📋
                </button>
              )}
            </div>
            <div className="font-mono text-xs mt-1 break-all">
              {eventData.parentId || 'None (root)'}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Description</h4>
        <div className="text-sm bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
          {description}
        </div>
      </div>

      {/* Related Events */}
      {(relatedEvents.parent || relatedEvents.children.length > 0 || relatedEvents.siblings.length > 0) && (
        <div>
          <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Related Events</h4>
          <div className="space-y-3">
            {relatedEvents.parent && renderRelatedEventLink(relatedEvents.parent, 'Parent')}
            
            {relatedEvents.children.map((child) => 
              renderRelatedEventLink(child, 'Child')
            )}
            
            {relatedEvents.siblings.map((sibling) => 
              renderRelatedEventLink(sibling, 'Sibling')
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderRawDataTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Raw Event Data</h4>
        <button
          onClick={() => copyToClipboard(JSON.stringify(eventData.rawBody, null, 2))}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          📋 Copy Raw Data
        </button>
      </div>
      <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 border">
        {JSON.stringify(eventData.rawBody, null, 2)}
      </pre>
    </div>
  );

  const renderPerformanceTab = () => {
    const rawBody = eventData.rawBody;
    
    if (!hasPerformanceData()) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <div>No performance metrics available for this event</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Timing Information */}
        {rawBody.totalDurationMs && (
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Timing</h4>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatDuration(rawBody.totalDurationMs)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Duration</div>
            </div>
          </div>
        )}

        {/* Token Usage */}
        {(rawBody.totalTokens || rawBody.inputTokens || rawBody.outputTokens) && (
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Token Usage</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rawBody.inputTokens && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {rawBody.inputTokens.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Input Tokens</div>
                </div>
              )}
              {rawBody.outputTokens && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {rawBody.outputTokens.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Output Tokens</div>
                </div>
              )}
              {rawBody.totalTokens && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {rawBody.totalTokens.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cache Information */}
        {(rawBody.cacheCreationTokens || rawBody.cacheReadTokens) && (
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Cache Usage</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rawBody.cacheCreationTokens && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {rawBody.cacheCreationTokens.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cache Creation</div>
                </div>
              )}
              {rawBody.cacheReadTokens && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                    {rawBody.cacheReadTokens.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cache Reads</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tool Usage */}
        {rawBody.toolUseCount && (
          <div>
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Tool Usage</h4>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {rawBody.toolUseCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tools Used</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${colors}`}>
          <h3 className="text-lg font-semibold flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span>{eventData.eventType} Details</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded-lg transition-colors"
            title="Close (Escape)"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              } ${tab.id === 'performance' && !hasPerformanceData() ? 'opacity-50' : ''}`}
              disabled={tab.id === 'performance' && !hasPerformanceData()}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'raw-data' && renderRawDataTab()}
          {activeTab === 'performance' && renderPerformanceTab()}
        </div>
      </div>
    </div>
  );
}