import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, ChevronDown, Search, RotateCcw, Expand, Minimize, Filter, X, Command, Badge } from 'lucide-react';
import { 
  EVENT_TYPE_ICONS, 
  EVENT_TYPE_COLORS, 
  buildSessionTree, 
  flattenVisibleNodes, 
  toggleNodeExpansion, 
  getStatusBadgeColors, 
  getEventDescription, 
  formatDuration,
  formatDateTime,
  SessionTree,
  UISessionNode,
  SessionStatus
} from '../utils/claudeCodeUIHelpers';
import { ClaudeCodeEventType, SessionNode } from '../../shared/claudeCodeTypes';
import { EventDetailsModal } from './EventDetailsModal';

/**
 * Claude Code Session Monitor - DAG Visualization
 * 
 * This component provides a comprehensive view of Claude Code sessions and their events
 * organized as Directed Acyclic Graphs (DAGs). Each session forms a tree structure
 * showing the hierarchical relationship between user prompts, tool usage, and system events.
 */

// Type declaration for window.configAPI
declare global {
  interface Window {
    configAPI: {
      getDAGState: () => Promise<any>;
    };
  }
}

interface ComponentState {
  selectedSessionId: string | null;
  searchQuery: string;
  autoRefresh: boolean;
  showEventDetails: boolean;
  selectedEventId: string | null;
  selectedEventTypes: Set<ClaudeCodeEventType>;
  showFilterDropdown: boolean;
}

interface DAGStateResponse {
  success: boolean;
  data?: {
    sessions: Record<string, {
      sessionId: string;
      nodeCount: number;
      nodes: SessionNode[];
    }>;
    sessionCount: number;
  };
  error?: string;
}

/**
 * Component for rendering individual tree nodes with proper hierarchical styling
 */
function EventTreeNodeComponent({ 
  node, 
  onToggleExpand,
  onSelectEvent,
  searchQuery = '',
  selectedEventTypes = new Set(Object.values(ClaudeCodeEventType))
}: { 
  node: UISessionNode; 
  onToggleExpand: (nodeId: string) => void;
  onSelectEvent: (nodeId: string) => void;
  searchQuery?: string;
  selectedEventTypes?: Set<ClaudeCodeEventType>;
}) {
  const hasChildren = node.hasChildren;
  const isExpanded = node.uiState.expanded;
  const eventTime = node.timeReceived;
  const timeDisplay = formatDateTime(eventTime);
  const description = getEventDescription(node);
  
  // Get icon and colors from utilities
  const icon = EVENT_TYPE_ICONS[node.eventType];
  const colors = EVENT_TYPE_COLORS[node.eventType];
  
  // This component now receives pre-filtered nodes, so we don't need to filter here
  // The filtering is done at the tree level
  
  // Visual connectors for tree structure
  const renderConnectors = () => {
    const connectors = [];
    
    // Vertical line for parent connections
    if (node.depth > 0) {
      for (let i = 0; i < node.depth; i++) {
        connectors.push(
          <div key={`connector-${i}`} className="w-6 flex justify-center">
            <div className="w-px h-full bg-border"></div>
          </div>
        );
      }
    }
    
    return <div className="flex">{connectors}</div>;
  };
  
  return (
    <div className="select-none">
      <div className="flex">
        {/* Tree connectors */}
        {renderConnectors()}
        
        {/* Node content */}
        <div 
          className={`flex-1 flex items-center gap-2 py-2 px-3 mx-1 rounded-lg transition-all duration-200 group hover:shadow-sm ${colors} ${
            node.uiState.selected ? 'ring-2 ring-primary' : ''
          } ${node.uiState.highlighted ? 'bg-opacity-70' : 'bg-opacity-30'}`}
        >
          {/* Expand/Collapse Icon */}
          <div 
            className="w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-black/10 rounded transition-colors"
            onClick={() => hasChildren && onToggleExpand(node.id)}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )
            ) : (
              <div className="w-2 h-2 rounded-full bg-current opacity-30"></div>
            )}
          </div>
          
          {/* Event Icon */}
          <span className="text-base" title={node.eventType}>{icon}</span>
          
          {/* Event Details */}
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onSelectEvent(node.id)}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{node.eventType}</span>
              <span className="text-xs opacity-70">{timeDisplay}</span>
              {hasChildren && (
                <span className="text-xs bg-current bg-opacity-20 px-1.5 py-0.5 rounded-full">
                  {node.children.length}
                </span>
              )}
            </div>
            <div className="text-xs opacity-80 truncate">
              {highlightSearchTerm(description, searchQuery)}
            </div>
          </div>
          
          {/* Details Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectEvent(node.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 bg-current bg-opacity-20 rounded hover:bg-opacity-30"
            title="View details"
          >
            Details
          </button>
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="transition-all duration-200">
          {node.children.map(child => (
            <EventTreeNodeComponent
              key={child.id}
              node={child}
              onToggleExpand={onToggleExpand}
              onSelectEvent={onSelectEvent}
              searchQuery={searchQuery}
              selectedEventTypes={selectedEventTypes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Recursively check if a node or its children match the search and filter criteria
 */
function matchesSearchAndFilterRecursive(
  node: UISessionNode, 
  searchQuery: string, 
  selectedEventTypes: Set<ClaudeCodeEventType>
): boolean {
  // Check if node matches event type filter
  const matchesFilter = selectedEventTypes.has(node.eventType);
  
  // Check if node matches search query
  const description = getEventDescription(node);
  const matchesSearch = !searchQuery || 
    node.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    description.toLowerCase().includes(searchQuery.toLowerCase());
  
  // Current node matches if it passes both filter and search
  const currentMatches = matchesFilter && matchesSearch;
  
  if (currentMatches) return true;
  
  // Check if any children match
  return node.children ? node.children.some(child => 
    matchesSearchAndFilterRecursive(child, searchQuery, selectedEventTypes)
  ) : false;
}

/**
 * Highlight search terms in text
 */
function highlightSearchTerm(text: string, searchQuery: string): React.ReactNode {
  if (!searchQuery) return text;
  
  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return parts.map((part, index) => 
    part.toLowerCase() === searchQuery.toLowerCase() ? 
      <span key={index} className="bg-yellow-300 bg-opacity-70 px-1 rounded">{part}</span> : 
      part
  );
}


/**
 * Session card component for the sidebar
 */
function SessionCard({ 
  sessionTree, 
  isSelected, 
  onSelect,
  searchQuery = '',
  selectedEventTypes = new Set(Object.values(ClaudeCodeEventType))
}: { 
  sessionTree: SessionTree; 
  isSelected: boolean; 
  onSelect: () => void;
  searchQuery?: string;
  selectedEventTypes?: Set<ClaudeCodeEventType>;
}) {
  const { sessionId, status, startTime, endTime, duration, totalEvents } = sessionTree;
  const timeDisplay = formatDateTime(startTime, false); // Don't include seconds for session list
  const statusColors = getStatusBadgeColors(status);
  
  // Get all nodes and calculate filtered count
  const allNodes = flattenVisibleNodes(sessionTree);
  const filteredNodes = allNodes.filter(node => {
    const description = getEventDescription(node);
    const matchesSearch = !searchQuery || 
      node.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedEventTypes.has(node.eventType);
    return matchesSearch && matchesFilter;
  });
  
  const filteredCount = filteredNodes.length;
  const hasActiveFilters = searchQuery || selectedEventTypes.size < Object.values(ClaudeCodeEventType).length;
  
  // Get most recent event (from filtered or all nodes)
  const recentNodes = hasActiveFilters ? filteredNodes : allNodes;
  const mostRecentEvent = recentNodes
    .filter(node => node.eventType !== ClaudeCodeEventType.SessionStart)
    .sort((a, b) => b.timeReceived.getTime() - a.timeReceived.getTime())[0];
  
  return (
    <div 
      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {sessionId.slice(-8)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors}`}>
            {status}
          </span>
        </div>
        <span className="text-xs text-gray-500">{timeDisplay}</span>
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
        <span className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
          {hasActiveFilters ? (
            <span className={filteredCount !== totalEvents ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}>
              {filteredCount}/{totalEvents} events
            </span>
          ) : (
            <span>{totalEvents} events</span>
          )}
        </span>
        {duration && (
          <>
            <span>•</span>
            <span>{formatDuration(duration)}</span>
          </>
        )}
        {hasActiveFilters && filteredCount === 0 && (
          <>
            <span>•</span>
            <span className="text-orange-600 dark:text-orange-400">No matches</span>
          </>
        )}
      </div>
      
      {/* Recent Activity */}
      {mostRecentEvent && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-sm">{EVENT_TYPE_ICONS[mostRecentEvent.eventType]}</span>
          <span className="text-gray-600 dark:text-gray-400 truncate">
            {mostRecentEvent.eventType}
          </span>
          <span className="text-gray-400 text-xs ml-auto">
            {formatDateTime(mostRecentEvent.timeReceived)}
          </span>
        </div>
      )}
    </div>
  );
}

export function ClaudeCodeFeatures() {
  const [dagState, setDagState] = useState<DAGStateResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTrees, setSessionTrees] = useState<Map<string, SessionTree>>(new Map());
  const [state, setState] = useState<ComponentState>({
    selectedSessionId: null,
    searchQuery: '',
    autoRefresh: true,
    showEventDetails: false,
    selectedEventId: null,
    selectedEventTypes: new Set(Object.values(ClaudeCodeEventType)),
    showFilterDropdown: false,
  });
  
  const fetchDAGState = async () => {
    const startTime = performance.now();
    console.log('\n[REACT DEBUG] fetchDAGState() called at', new Date().toISOString());
    setLoading(true);
    setError(null);
    try {
      console.log('[REACT DEBUG] Calling window.configAPI.getDAGState()');
      console.log('[REACT DEBUG] window.configAPI exists:', !!window.configAPI);
      console.log('[REACT DEBUG] getDAGState method exists:', typeof window.configAPI?.getDAGState);
      
      const result: DAGStateResponse = await window.configAPI.getDAGState();
      
      console.log('[REACT DEBUG] IPC result received:', {
        type: typeof result,
        success: result?.success,
        hasData: !!result?.data,
        error: result?.error
      });
      
      if (result.success && result.data) {
        console.log('[REACT DEBUG] Processing successful result:', {
          sessionCount: result.data.sessionCount,
          sessionsKeys: result.data.sessions ? Object.keys(result.data.sessions) : 'no sessions',
          dataStructure: {
            hasSessionCount: 'sessionCount' in result.data,
            hasSessions: 'sessions' in result.data,
            sessionsType: typeof result.data.sessions
          }
        });
        
        setDagState(result.data);
        
        // Build session trees from the raw data
        const newSessionTrees = new Map<string, SessionTree>();
        
        console.log('[REACT DEBUG] Building session trees...');
        let processedSessions = 0;
        
        for (const [sessionId, sessionData] of Object.entries(result.data.sessions)) {
          console.log(`[REACT DEBUG] Processing session ${++processedSessions}: ${sessionId}`, {
            nodeCount: sessionData.nodeCount,
            actualNodesLength: sessionData.nodes?.length,
            hasNodes: !!sessionData.nodes,
            nodesType: typeof sessionData.nodes
          });
          
          // Convert raw nodes to SessionNode format with proper Date objects
          const sessionNodes: SessionNode[] = sessionData.nodes.map((node, index) => {
            const convertedNode = {
              ...node,
              timeReceived: new Date(node.timeReceived),
              eventType: node.eventType as ClaudeCodeEventType
            };
            
            if (index === 0) {
              console.log(`[REACT DEBUG] First node in session ${sessionId}:`, {
                id: convertedNode.id,
                eventType: convertedNode.eventType,
                timeReceived: convertedNode.timeReceived,
                hasRawBody: !!convertedNode.rawBody
              });
            }
            
            return convertedNode;
          });
          
          console.log(`[REACT DEBUG] Converted ${sessionNodes.length} nodes for session ${sessionId}`);
          console.log(`[REACT DEBUG] Calling buildSessionTree for session ${sessionId}...`);
          
          const sessionTree = buildSessionTree(sessionNodes, sessionId);
          
          console.log(`[REACT DEBUG] buildSessionTree result for ${sessionId}:`, {
            success: !!sessionTree,
            sessionId: sessionTree?.sessionId,
            totalEvents: sessionTree?.totalEvents,
            hasRootNode: !!sessionTree?.rootNode
          });
          
          if (sessionTree) {
            // Preserve expansion state from existing tree if it exists
            const existingTree = sessionTrees.get(sessionId);
            if (existingTree) {
              // Create a map of all existing node states
              const existingStates = new Map<string, { expanded: boolean; selected: boolean; highlighted: boolean }>();
              existingTree.allNodes.forEach((node, id) => {
                existingStates.set(id, {
                  expanded: node.uiState.expanded,
                  selected: node.uiState.selected,
                  highlighted: node.uiState.highlighted
                });
              });
              
              // Apply preserved states to the new tree
              const applyPreservedState = (newNode: UISessionNode) => {
                const existingState = existingStates.get(newNode.id);
                if (existingState) {
                  // This is an existing node - preserve its state
                  newNode.uiState.expanded = existingState.expanded;
                  newNode.uiState.selected = existingState.selected;
                  newNode.uiState.highlighted = existingState.highlighted;
                } else {
                  // This is a new node - use smart defaults
                  // Only auto-expand if it's a UserPromptSubmit or the most recent event
                  if (newNode.eventType === ClaudeCodeEventType.UserPromptSubmit) {
                    newNode.uiState.expanded = true;
                  } else {
                    // Keep new events collapsed by default unless they're at depth 0
                    newNode.uiState.expanded = newNode.depth === 0;
                  }
                }
                // Recursively apply to children
                newNode.children.forEach(child => applyPreservedState(child));
              };
              
              applyPreservedState(sessionTree.rootNode);
              console.log(`[REACT DEBUG] Preserved expansion state for session ${sessionId}`, {
                existingNodes: existingStates.size,
                newNodes: sessionTree.allNodes.size
              });
            }
            
            newSessionTrees.set(sessionId, sessionTree);
            console.log(`[REACT DEBUG] Added session ${sessionId} to sessionTrees map`);
          } else {
            console.warn(`[REACT DEBUG] Failed to build session tree for ${sessionId}`);
          }
        }
        
        console.log('[REACT DEBUG] Session trees building complete:', {
          totalSessionsProcessed: processedSessions,
          successfulTrees: newSessionTrees.size,
          treeKeys: Array.from(newSessionTrees.keys())
        });
        
        setSessionTrees(newSessionTrees);
        console.log('[REACT DEBUG] setSessionTrees called with', newSessionTrees.size, 'sessions');
        
        // Auto-select first session only if none was ever selected
        if (!state.selectedSessionId && newSessionTrees.size > 0) {
          const firstSessionId = Array.from(newSessionTrees.keys())[0];
          console.log('[REACT DEBUG] Auto-selecting first session:', firstSessionId);
          setState(prev => ({ ...prev, selectedSessionId: firstSessionId }));
        } else if (state.selectedSessionId && !newSessionTrees.has(state.selectedSessionId)) {
          // If the selected session no longer exists, clear selection
          console.log('[REACT DEBUG] Selected session no longer exists, clearing selection');
          setState(prev => ({ ...prev, selectedSessionId: null }));
        } else {
          // Maintain current selection during refresh
          console.log('[REACT DEBUG] Maintaining current selection:', {
            hasSelectedSession: !!state.selectedSessionId,
            currentSelected: state.selectedSessionId,
            sessionExists: newSessionTrees.has(state.selectedSessionId || ''),
            availableSessions: newSessionTrees.size
          });
        }
      } else {
        console.log('[REACT DEBUG] Result was not successful or had no data');
        const errorMsg = result.error || 'Failed to fetch DAG state';
        console.error('[REACT DEBUG] Setting error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Error fetching DAG state: ' + (err as Error).message;
      console.error('[REACT DEBUG] Exception in fetchDAGState:', errorMsg);
      console.error('[REACT DEBUG] Full error object:', err);
      setError(errorMsg);
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log('[REACT DEBUG] fetchDAGState complete, setting loading to false');
      console.log(`[REACT DEBUG] Total fetchDAGState duration: ${duration.toFixed(2)}ms`);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDAGState();
    
    let interval: NodeJS.Timeout | null = null;
    if (state.autoRefresh) {
      interval = setInterval(fetchDAGState, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.autoRefresh]);
  
  const handleToggleExpand = (nodeId: string) => {
    const selectedTree = state.selectedSessionId ? sessionTrees.get(state.selectedSessionId) : null;
    if (selectedTree) {
      toggleNodeExpansion(selectedTree, nodeId);
      // Force re-render by updating the map
      setSessionTrees(new Map(sessionTrees));
    }
  };
  
  const handleSelectEvent = (eventId: string) => {
    setState(prev => ({
      ...prev,
      selectedEventId: eventId,
      showEventDetails: true
    }));
  };
  
  const handleCloseEventDetails = () => {
    setState(prev => ({
      ...prev,
      selectedEventId: null,
      showEventDetails: false
    }));
  };
  
  const handleExpandAll = () => {
    const selectedTree = state.selectedSessionId ? sessionTrees.get(state.selectedSessionId) : null;
    if (selectedTree) {
      // Expand all nodes
      selectedTree.allNodes.forEach(node => {
        node.uiState.expanded = true;
      });
      setSessionTrees(new Map(sessionTrees));
    }
  };
  
  const handleCollapseAll = () => {
    const selectedTree = state.selectedSessionId ? sessionTrees.get(state.selectedSessionId) : null;
    if (selectedTree) {
      // Collapse all nodes except root
      selectedTree.allNodes.forEach((node, nodeId) => {
        node.uiState.expanded = nodeId === selectedTree.rootNode.id;
      });
      setSessionTrees(new Map(sessionTrees));
    }
  };
  
  // Toggle event type filter
  const handleToggleEventType = (eventType: ClaudeCodeEventType) => {
    setState(prev => {
      const newTypes = new Set(prev.selectedEventTypes);
      if (newTypes.has(eventType)) {
        newTypes.delete(eventType);
      } else {
        newTypes.add(eventType);
      }
      return { ...prev, selectedEventTypes: newTypes };
    });
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setState(prev => ({
      ...prev,
      selectedEventTypes: new Set(Object.values(ClaudeCodeEventType)),
      searchQuery: ''
    }));
  };
  
  // Select all event types
  const handleSelectAllEventTypes = () => {
    setState(prev => ({
      ...prev,
      selectedEventTypes: new Set(Object.values(ClaudeCodeEventType))
    }));
  };
  
  // Deselect all event types
  const handleDeselectAllEventTypes = () => {
    setState(prev => ({
      ...prev,
      selectedEventTypes: new Set()
    }));
  };
  
  // Get selected session tree
  const selectedSessionTree = state.selectedSessionId ? sessionTrees.get(state.selectedSessionId) : null;
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Track previous search/filter state to avoid unnecessary expansions
  const prevSearchRef = useRef(state.searchQuery);
  const prevFilterRef = useRef(state.selectedEventTypes);
  
  // Auto-expand nodes when searching or filtering changes
  useEffect(() => {
    const searchChanged = prevSearchRef.current !== state.searchQuery;
    const filterChanged = prevFilterRef.current !== state.selectedEventTypes;
    
    if (selectedSessionTree && (searchChanged || filterChanged) && 
        (state.searchQuery || state.selectedEventTypes.size < Object.values(ClaudeCodeEventType).length)) {
      // Clone the session trees to avoid mutating state directly
      const newSessionTrees = new Map(sessionTrees);
      const treeToUpdate = newSessionTrees.get(selectedSessionTree.sessionId);
      
      if (treeToUpdate) {
        // Auto-expand nodes that contain matching results
        const expandMatchingNodes = (node: UISessionNode): boolean => {
          let hasMatchingDescendant = false;
          
          // Check children first
          for (const child of node.children) {
            if (expandMatchingNodes(child)) {
              hasMatchingDescendant = true;
            }
          }
          
          // Check if current node matches
          const description = getEventDescription(node);
          const matchesSearch = !state.searchQuery || 
            node.eventType.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            description.toLowerCase().includes(state.searchQuery.toLowerCase());
          const matchesFilter = state.selectedEventTypes.has(node.eventType);
          const currentMatches = matchesSearch && matchesFilter;
          
          // Expand if current node matches or has matching descendants
          if (currentMatches || hasMatchingDescendant) {
            node.uiState.expanded = true;
            return true;
          }
          
          return false;
        };
        
        expandMatchingNodes(treeToUpdate.rootNode);
        setSessionTrees(newSessionTrees);
      }
    }
    
    // Update refs
    prevSearchRef.current = state.searchQuery;
    prevFilterRef.current = state.selectedEventTypes;
  }, [state.searchQuery, state.selectedEventTypes, selectedSessionTree?.sessionId]);
  
  // Enhanced filtering logic that maintains tree structure
  const getFilteredTree = useCallback((tree: SessionTree | null): UISessionNode | null => {
    if (!tree) return null;
    
    const filterNodeAndChildren = (node: UISessionNode): UISessionNode | null => {
      // Filter children first
      const filteredChildren = node.children
        .map(child => filterNodeAndChildren(child))
        .filter(child => child !== null) as UISessionNode[];
      
      // Check if current node matches criteria
      const description = getEventDescription(node);
      const matchesSearch = !state.searchQuery || 
        node.eventType.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(state.searchQuery.toLowerCase());
      const matchesFilter = state.selectedEventTypes.has(node.eventType);
      
      // Include node if it matches or has matching children
      if ((matchesSearch && matchesFilter) || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };
    
    return filterNodeAndChildren(tree.rootNode);
  }, [state.searchQuery, state.selectedEventTypes]);
  
  // Get filtered visible nodes
  const filteredRootNode = getFilteredTree(selectedSessionTree);
  
  // Get event type counts for the current session
  const eventTypeCounts = useMemo(() => {
    if (!selectedSessionTree) return new Map();
    
    const counts = new Map<ClaudeCodeEventType, number>();
    const allNodes = flattenVisibleNodes(selectedSessionTree);
    
    allNodes.forEach(node => {
      counts.set(node.eventType, (counts.get(node.eventType) || 0) + 1);
    });
    
    return counts;
  }, [selectedSessionTree]);
  
  // Calculate filtered event counts
  const filteredEventCounts = useMemo(() => {
    if (!filteredRootNode) return new Map();
    
    const counts = new Map<ClaudeCodeEventType, number>();
    
    const countNodes = (node: UISessionNode) => {
      const description = getEventDescription(node);
      const matchesSearch = !state.searchQuery || 
        node.eventType.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(state.searchQuery.toLowerCase());
      const matchesFilter = state.selectedEventTypes.has(node.eventType);
      
      if (matchesSearch && matchesFilter) {
        counts.set(node.eventType, (counts.get(node.eventType) || 0) + 1);
      }
      
      node.children.forEach(child => countNodes(child));
    };
    
    countNodes(filteredRootNode);
    return counts;
  }, [filteredRootNode, state.searchQuery, state.selectedEventTypes]);
  
  // Calculate active filter count
  const activeFilterCount = Object.values(ClaudeCodeEventType).length - state.selectedEventTypes.size;
  
  // Debug current render state
  console.log('[REACT RENDER DEBUG] Component rendering with:', {
    sessionTreesSize: sessionTrees.size,
    sessionTreesKeys: Array.from(sessionTrees.keys()),
    selectedSessionId: state.selectedSessionId,
    selectedSessionTree: !!selectedSessionTree,
    dagStateExists: !!dagState,
    dagStateSessionCount: dagState?.sessionCount,
    loading: loading,
    error: !!error,
    timestamp: new Date().toISOString()
  });
  
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Claude Code Sessions</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor and analyze Claude Code session DAGs
          </p>
        </div>
        
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.autoRefresh}
              onChange={(e) => setState(prev => ({ ...prev, autoRefresh: e.target.checked }))}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Auto-refresh (1s)</span>
          </label>
          
          <button
            onClick={fetchDAGState}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
      
      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 p-6 min-h-0">
        {/* Left Sidebar - Sessions */}
        <div className="w-80 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Sessions ({sessionTrees.size})
            </h3>
            {sessionTrees.size === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                No sessions yet. Start using Claude Code to see sessions appear here.
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {Array.from(sessionTrees.values()).map((sessionTree) => (
              <SessionCard
                key={sessionTree.sessionId}
                sessionTree={sessionTree}
                isSelected={state.selectedSessionId === sessionTree.sessionId}
                onSelect={() => setState(prev => ({ ...prev, selectedSessionId: sessionTree.sessionId }))}
                searchQuery={state.searchQuery}
                selectedEventTypes={state.selectedEventTypes}
              />
            ))}
          </div>
        </div>
        
        {/* Main Area - Event Tree */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {selectedSessionTree ? (
            <>
              {/* Controls Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Session Events 
                    {state.searchQuery || activeFilterCount > 0 ? (
                      <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                        ({Array.from(filteredEventCounts.values()).reduce((a, b) => a + b, 0)}/{selectedSessionTree.totalEvents})
                      </span>
                    ) : (
                      <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                        ({selectedSessionTree.totalEvents})
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExpandAll}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Expand className="w-4 h-4" />
                      Expand All
                    </button>
                    <button
                      onClick={handleCollapseAll}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Minimize className="w-4 h-4" />
                      Collapse All
                    </button>
                  </div>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search events by type or description... (Cmd/Ctrl+F)"
                      value={state.searchQuery}
                      onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                    />
                    {state.searchQuery && (
                      <button
                        onClick={() => setState(prev => ({ ...prev, searchQuery: '' }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Filter Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setState(prev => ({ ...prev, showFilterDropdown: !prev.showFilterDropdown }))}
                      className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors relative"
                    >
                      <Filter className="w-4 h-4" />
                      Filter
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                    
                    {state.showFilterDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">Filter by Event Type</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSelectAllEventTypes}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                All
                              </button>
                              <button
                                onClick={handleDeselectAllEventTypes}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                None
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {Object.values(ClaudeCodeEventType).map(eventType => {
                              const count = eventTypeCounts.get(eventType) || 0;
                              const filteredCount = filteredEventCounts.get(eventType) || 0;
                              return (
                                <label key={eventType} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={state.selectedEventTypes.has(eventType)}
                                    onChange={() => handleToggleEventType(eventType)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-lg">{EVENT_TYPE_ICONS[eventType]}</span>
                                  <span className="flex-1 text-sm">{eventType}</span>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    {state.searchQuery || activeFilterCount > 0 ? (
                                      <span className={filteredCount !== count ? 'text-blue-600 font-medium' : ''}>
                                        {filteredCount}/{count}
                                      </span>
                                    ) : (
                                      <span>{count}</span>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between">
                            <button
                              onClick={handleClearFilters}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Clear All Filters
                            </button>
                            <button
                              onClick={() => setState(prev => ({ ...prev, showFilterDropdown: false }))}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Event Tree */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredRootNode ? (
                  <div className="space-y-1">
                    <EventTreeNodeComponent
                      key={filteredRootNode.id}
                      node={filteredRootNode}
                      onToggleExpand={handleToggleExpand}
                      onSelectEvent={handleSelectEvent}
                      searchQuery={state.searchQuery}
                      selectedEventTypes={state.selectedEventTypes}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No events found</p>
                      <p className="text-sm">
                        {state.searchQuery && activeFilterCount > 0 ? (
                          <>Try adjusting your search query or filters</>
                        ) : state.searchQuery ? (
                          <>Try adjusting your search query</>
                        ) : activeFilterCount > 0 ? (
                          <>Try adjusting your filters</>
                        ) : (
                          <>No events to display</>
                        )}
                      </p>
                      {(state.searchQuery || activeFilterCount > 0) && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8" />
                </div>
                <p className="text-lg mb-2">Select a session to view events</p>
                <p className="text-sm">Choose a session from the sidebar to see its event tree</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Event Details Modal */}
      {state.showEventDetails && (
        <EventDetailsModal
          eventId={state.selectedEventId}
          dagState={dagState}
          onClose={handleCloseEventDetails}
        />
      )}
      
      {/* Click outside filter dropdown to close */}
      {state.showFilterDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setState(prev => ({ ...prev, showFilterDropdown: false }))}
        />
      )}
    </div>
  );
}