import { ClaudeCodeEventType, SessionNode } from '../../shared/claudeCodeTypes';

/**
 * Event type to icon mappings using emoji
 */
export const EVENT_TYPE_ICONS: Record<ClaudeCodeEventType, string> = {
  [ClaudeCodeEventType.SessionStart]: '🚀',
  [ClaudeCodeEventType.UserPromptSubmit]: '💬',
  [ClaudeCodeEventType.PreToolUse]: '🔧',
  [ClaudeCodeEventType.PostToolUse]: '✅',
  [ClaudeCodeEventType.Notification]: '📢',
  [ClaudeCodeEventType.Stop]: '⏹️',
  [ClaudeCodeEventType.SubagentStop]: '🛑',
  [ClaudeCodeEventType.PreCompact]: '📦',
  [ClaudeCodeEventType.Unknown]: '❓'
};

/**
 * Event type to color mappings using Tailwind CSS classes
 */
export const EVENT_TYPE_COLORS: Record<ClaudeCodeEventType, string> = {
  [ClaudeCodeEventType.SessionStart]: 'bg-green-100 text-green-800 border-green-200',
  [ClaudeCodeEventType.UserPromptSubmit]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ClaudeCodeEventType.PreToolUse]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ClaudeCodeEventType.PostToolUse]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [ClaudeCodeEventType.Notification]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ClaudeCodeEventType.Stop]: 'bg-red-100 text-red-800 border-red-200',
  [ClaudeCodeEventType.SubagentStop]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ClaudeCodeEventType.PreCompact]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [ClaudeCodeEventType.Unknown]: 'bg-gray-100 text-gray-800 border-gray-200'
};

/**
 * Session status derived from events
 */
export type SessionStatus = 'active' | 'completed' | 'failed' | 'stopped' | 'unknown';

/**
 * UI state for tree nodes
 */
export interface TreeNodeUIState {
  id: string;
  expanded: boolean;
  selected: boolean;
  highlighted: boolean;
}

/**
 * Enhanced session node with UI state
 */
export interface UISessionNode extends SessionNode {
  uiState: TreeNodeUIState;
  depth: number;
  hasChildren: boolean;
  isLastChild: boolean;
  children: UISessionNode[];
}

/**
 * Tree structure for hierarchical display
 */
export interface SessionTree {
  sessionId: string;
  rootNode: UISessionNode;
  allNodes: Map<string, UISessionNode>;
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  totalEvents: number;
}

/**
 * Determine session status from events
 * @param nodes - Array of nodes in the session
 * @returns The overall session status
 */
export function determineSessionStatus(nodes: SessionNode[]): SessionStatus {
  if (!nodes || nodes.length === 0) {
    return 'unknown';
  }

  // Check for terminal events
  const hasStop = nodes.some(node => node.eventType === ClaudeCodeEventType.Stop);
  const hasSubagentStop = nodes.some(node => node.eventType === ClaudeCodeEventType.SubagentStop);
  const hasPreCompact = nodes.some(node => node.eventType === ClaudeCodeEventType.PreCompact);

  // Check for error indicators in raw event data
  const hasErrors = nodes.some(node => {
    if (node.rawBody && typeof node.rawBody === 'object') {
      const body = node.rawBody;
      return body.error || body.failed || body.exception || 
             (body.status && body.status.toLowerCase().includes('error')) ||
             (body.status && body.status.toLowerCase().includes('failed'));
    }
    return false;
  });

  if (hasErrors) {
    return 'failed';
  }

  if (hasStop || hasSubagentStop) {
    return 'stopped';
  }

  if (hasPreCompact) {
    return 'completed';
  }

  // If we have recent activity (within last 5 minutes), consider it active
  const now = new Date();
  const recentActivity = nodes.some(node => {
    const timeDiff = now.getTime() - node.timeReceived.getTime();
    return timeDiff < 5 * 60 * 1000; // 5 minutes
  });

  if (recentActivity) {
    return 'active';
  }

  return 'completed';
}

/**
 * Build tree structure from flat DAG nodes
 * @param nodes - Array of flat session nodes
 * @param sessionId - The session ID to build tree for
 * @returns SessionTree structure or undefined if no nodes found
 */
export function buildSessionTree(nodes: SessionNode[], sessionId: string): SessionTree | undefined {
  console.log(`\n[BUILD TREE DEBUG] buildSessionTree called for session: ${sessionId}`);
  console.log(`[BUILD TREE DEBUG] Input nodes:`, {
    totalNodes: nodes.length,
    nodeTypes: nodes.map(n => n.eventType),
    sessionIds: [...new Set(nodes.map(n => n.sessionId))],
    targetSessionId: sessionId
  });
  
  // Filter nodes for this session
  const sessionNodes = nodes.filter(node => node.sessionId === sessionId);
  console.log(`[BUILD TREE DEBUG] Filtered session nodes:`, {
    filteredCount: sessionNodes.length,
    originalCount: nodes.length,
    sessionNodesIds: sessionNodes.map(n => n.id),
    eventTypes: sessionNodes.map(n => n.eventType)
  });
  
  if (sessionNodes.length === 0) {
    console.warn(`[BUILD TREE DEBUG] No nodes found for session ${sessionId}, returning undefined`);
    return undefined;
  }

  // Find root node (SessionStart or node without parentId)
  const rootNode = sessionNodes.find(node => 
    node.eventType === ClaudeCodeEventType.SessionStart || !node.parentId
  );
  
  console.log(`[BUILD TREE DEBUG] Root node search:`, {
    foundRoot: !!rootNode,
    rootNodeId: rootNode?.id,
    rootEventType: rootNode?.eventType,
    nodesWithoutParent: sessionNodes.filter(n => !n.parentId).map(n => ({ id: n.id, eventType: n.eventType })),
    sessionStartNodes: sessionNodes.filter(n => n.eventType === ClaudeCodeEventType.SessionStart).map(n => ({ id: n.id, eventType: n.eventType }))
  });

  if (!rootNode) {
    console.warn(`[BUILD TREE DEBUG] No root node found for session ${sessionId}, returning undefined`);
    return undefined;
  }

  // Create maps for quick lookups
  const nodeMap = new Map<string, SessionNode>();
  const childrenMap = new Map<string, SessionNode[]>();

  console.log(`[BUILD TREE DEBUG] Building node maps...`);
  sessionNodes.forEach(node => {
    nodeMap.set(node.id, node);
    
    if (node.parentId) {
      if (!childrenMap.has(node.parentId)) {
        childrenMap.set(node.parentId, []);
      }
      childrenMap.get(node.parentId)!.push(node);
    }
  });

  console.log(`[BUILD TREE DEBUG] Node maps created:`, {
    nodeMapSize: nodeMap.size,
    childrenMapSize: childrenMap.size,
    parentIds: Array.from(childrenMap.keys()),
    childCounts: Array.from(childrenMap.entries()).map(([parentId, children]) => ({
      parentId,
      childrenCount: children.length,
      childrenIds: children.map(c => c.id)
    }))
  });

  // Sort children by timeReceived for consistent ordering
  childrenMap.forEach(children => {
    children.sort((a, b) => a.timeReceived.getTime() - b.timeReceived.getTime());
  });
  console.log(`[BUILD TREE DEBUG] Children sorted by time`);

  // Create UI nodes map
  const uiNodesMap = new Map<string, UISessionNode>();

  // Recursive function to build UI tree
  function buildUINode(node: SessionNode, depth: number = 0, parentSiblings: SessionNode[] = []): UISessionNode {
    const children = childrenMap.get(node.id) || [];
    const isLastChild = parentSiblings.length > 0 && 
                       parentSiblings[parentSiblings.length - 1].id === node.id;

    console.log(`[BUILD TREE DEBUG] Building UI node:`, {
      nodeId: node.id,
      eventType: node.eventType,
      depth: depth,
      childrenCount: children.length,
      childrenIds: children.map(c => c.id),
      isLastChild: isLastChild
    });

    const uiNode: UISessionNode = {
      ...node,
      uiState: {
        id: node.id,
        expanded: depth < 2, // Auto-expand first two levels
        selected: false,
        highlighted: false
      },
      depth,
      hasChildren: children.length > 0,
      isLastChild,
      children: []
    };

    // Recursively build children
    uiNode.children = children.map(child => buildUINode(child, depth + 1, children));

    uiNodesMap.set(node.id, uiNode);
    return uiNode;
  }

  console.log(`[BUILD TREE DEBUG] Building UI tree from root:`, rootNode.id);
  const uiRootNode = buildUINode(rootNode);
  console.log(`[BUILD TREE DEBUG] UI tree built:`, {
    rootNodeId: uiRootNode.id,
    uiNodesMapSize: uiNodesMap.size,
    rootHasChildren: uiRootNode.hasChildren,
    rootChildrenCount: uiRootNode.children.length
  });

  // Calculate session metadata
  const status = determineSessionStatus(sessionNodes);
  const startTime = sessionNodes.reduce((earliest, node) => 
    node.timeReceived < earliest ? node.timeReceived : earliest, 
    sessionNodes[0].timeReceived
  );
  
  const endTime = status === 'active' ? undefined : 
    sessionNodes.reduce((latest, node) => 
      node.timeReceived > latest ? node.timeReceived : latest, 
      sessionNodes[0].timeReceived
    );

  const duration = endTime ? endTime.getTime() - startTime.getTime() : undefined;

  const sessionTree = {
    sessionId,
    rootNode: uiRootNode,
    allNodes: uiNodesMap,
    status,
    startTime,
    endTime,
    duration,
    totalEvents: sessionNodes.length
  };

  console.log(`[BUILD TREE DEBUG] Session tree complete:`, {
    sessionId: sessionTree.sessionId,
    status: sessionTree.status,
    startTime: sessionTree.startTime,
    endTime: sessionTree.endTime,
    duration: sessionTree.duration,
    totalEvents: sessionTree.totalEvents,
    allNodesCount: sessionTree.allNodes.size
  });

  return sessionTree;
}

/**
 * Get formatted duration string
 * @param durationMs - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2m 30s", "45s", "1h 5m")
 */
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Get status badge color classes
 * @param status - Session status
 * @returns Tailwind CSS classes for status badge
 */
export function getStatusBadgeColors(status: SessionStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'stopped':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'unknown':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Extract description from event raw body
 * @param node - Session node
 * @returns Human-readable description of the event
 */
export function getEventDescription(node: SessionNode): string {
  const { eventType, rawBody } = node;

  // Handle different event types
  switch (eventType) {
    case ClaudeCodeEventType.SessionStart:
      return 'Session started';

    case ClaudeCodeEventType.UserPromptSubmit:
      if (rawBody && rawBody.prompt) {
        // Truncate long prompts
        const prompt = rawBody.prompt.toString();
        return prompt.length > 100 ? `${prompt.substring(0, 100)}...` : prompt;
      }
      return 'User prompt submitted';

    case ClaudeCodeEventType.PreToolUse:
      if (rawBody && rawBody.toolName) {
        return `Starting ${rawBody.toolName}`;
      }
      return 'Tool use starting';

    case ClaudeCodeEventType.PostToolUse:
      if (rawBody && rawBody.toolName) {
        const status = rawBody.success ? 'completed' : 'failed';
        return `${rawBody.toolName} ${status}`;
      }
      return 'Tool use completed';

    case ClaudeCodeEventType.Notification:
      if (rawBody && rawBody.message) {
        return rawBody.message.toString();
      }
      return 'Notification';

    case ClaudeCodeEventType.Stop:
      return 'Session stopped';

    case ClaudeCodeEventType.SubagentStop:
      if (rawBody && rawBody.reason) {
        return `Subagent stopped: ${rawBody.reason}`;
      }
      return 'Subagent stopped';

    case ClaudeCodeEventType.PreCompact:
      return 'Compacting session';

    case ClaudeCodeEventType.Unknown:
    default:
      return `Unknown event: ${eventType}`;
  }
}

/**
 * Toggle expansion state of a node and optionally its children
 * @param tree - Session tree
 * @param nodeId - Node ID to toggle
 * @param recursive - Whether to apply to all children
 */
export function toggleNodeExpansion(tree: SessionTree, nodeId: string, recursive: boolean = false): void {
  const node = tree.allNodes.get(nodeId);
  if (!node) return;

  node.uiState.expanded = !node.uiState.expanded;

  if (recursive) {
    function toggleChildren(parentNode: UISessionNode): void {
      parentNode.children.forEach(child => {
        child.uiState.expanded = parentNode.uiState.expanded;
        toggleChildren(child);
      });
    }
    toggleChildren(node);
  }
}

/**
 * Flatten tree for list rendering while respecting expansion state
 * @param tree - Session tree
 * @returns Flat array of visible nodes in tree order
 */
export function flattenVisibleNodes(tree: SessionTree): UISessionNode[] {
  const result: UISessionNode[] = [];

  function traverse(node: UISessionNode): void {
    result.push(node);
    
    if (node.uiState.expanded && node.children.length > 0) {
      node.children.forEach(child => traverse(child));
    }
  }

  traverse(tree.rootNode);
  return result;
}