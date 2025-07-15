import { SubagentInfo } from '../../shared/types';

export interface SubagentTreeNode {
  subagent: SubagentInfo;
  children: SubagentTreeNode[];
  expanded: boolean;
}

export interface SessionTree {
  sessionId: string;
  roots: SubagentTreeNode[];
  expanded: boolean;
  totalCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
}

/**
 * Build a tree structure from flat subagent list
 */
export function buildSubagentTree(
  subagents: SubagentInfo[], 
  expandedNodes: Set<string>
): Map<string, SessionTree> {
  const sessionMap = new Map<string, SessionTree>();
  const nodeMap = new Map<string, SubagentTreeNode>();
  
  // First pass: create all nodes
  subagents.forEach(subagent => {
    const node: SubagentTreeNode = {
      subagent,
      children: [],
      expanded: expandedNodes.has(subagent.id)
    };
    nodeMap.set(subagent.id, node);
  });
  
  // Second pass: build tree structure and organize by session
  subagents.forEach(subagent => {
    const node = nodeMap.get(subagent.id)!;
    
    // Get or create session tree
    if (!sessionMap.has(subagent.sessionId)) {
      sessionMap.set(subagent.sessionId, {
        sessionId: subagent.sessionId,
        roots: [],
        expanded: expandedNodes.has(subagent.sessionId),
        totalCount: 0,
        activeCount: 0,
        completedCount: 0,
        failedCount: 0
      });
    }
    
    const sessionTree = sessionMap.get(subagent.sessionId)!;
    sessionTree.totalCount++;
    
    // Update counts
    switch (subagent.status) {
      case 'active':
        sessionTree.activeCount++;
        break;
      case 'completed':
        sessionTree.completedCount++;
        break;
      case 'failed':
        sessionTree.failedCount++;
        break;
    }
    
    // Add to parent or root
    if (subagent.parentId) {
      const parent = nodeMap.get(subagent.parentId);
      if (parent) {
        parent.children.push(node);
        // Sort children by start time
        parent.children.sort((a, b) => 
          new Date(a.subagent.startTime).getTime() - new Date(b.subagent.startTime).getTime()
        );
      } else {
        // Parent not found, add as root
        sessionTree.roots.push(node);
      }
    } else {
      // No parent, this is a root
      sessionTree.roots.push(node);
    }
  });
  
  // Sort roots by start time
  sessionMap.forEach(sessionTree => {
    sessionTree.roots.sort((a, b) => 
      new Date(a.subagent.startTime).getTime() - new Date(b.subagent.startTime).getTime()
    );
  });
  
  return sessionMap;
}

/**
 * Get a flattened list of visible nodes for rendering
 */
export function getFlattenedTree(
  sessionTree: SessionTree,
  expandedNodes: Set<string>
): SubagentTreeNode[] {
  const result: SubagentTreeNode[] = [];
  
  function addNode(node: SubagentTreeNode, depth: number = 0) {
    result.push(node);
    
    // Only add children if this node is expanded
    if (expandedNodes.has(node.subagent.id)) {
      node.children.forEach(child => addNode(child, depth + 1));
    }
  }
  
  sessionTree.roots.forEach(root => addNode(root));
  
  return result;
}

/**
 * Get session summary for collapsed view
 */
export function getSessionTreeSummary(sessionTree: SessionTree): string {
  if (sessionTree.roots.length === 0) {
    return `Session ${sessionTree.sessionId.substring(0, 8)}`;
  }
  
  // Find the most descriptive root task
  const descriptions = sessionTree.roots
    .map(node => node.subagent.description)
    .filter(Boolean);
    
  if (descriptions.length > 0) {
    const longestDesc = descriptions.reduce((a, b) => a.length > b.length ? a : b);
    return longestDesc;
  }
  
  return `Session ${sessionTree.sessionId.substring(0, 8)}`;
}