import { SubagentInfo, TaskGroup } from '../../shared/types';

export interface SubagentTreeNode {
  subagent: SubagentInfo;
}

export interface TaskGroupNode {
  taskGroup: TaskGroup;
  expanded: boolean;
}

export interface SessionTree {
  sessionId: string;
  subagents: SubagentTreeNode[];  // Keep for backward compatibility
  taskGroups: TaskGroupNode[];     // New: grouped by description
  expanded: boolean;
  totalCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
}

/**
 * Create task groups from subagents based on description
 */
function createTaskGroups(subagents: SubagentInfo[], expandedNodes: Set<string>): TaskGroupNode[] {
  const taskGroupMap = new Map<string, TaskGroup>();
  
  // Group subagents by description
  subagents.forEach(subagent => {
    const description = subagent.description || 'Unnamed Task';
    
    if (!taskGroupMap.has(description)) {
      taskGroupMap.set(description, {
        description,
        events: [],
        status: 'active',
        startTime: subagent.startTime,
        endTime: undefined
      });
    }
    
    const taskGroup = taskGroupMap.get(description)!;
    taskGroup.events.push(subagent);
    
    // Update task group based on events
    // If we have a completed event, the task group is completed
    const hasCompletedEvent = taskGroup.events.some(e => e.status === 'completed');
    const hasFailedEvent = taskGroup.events.some(e => e.status === 'failed');
    
    if (hasCompletedEvent) {
      taskGroup.status = 'completed';
      // Find the latest end time from completed events
      const completedEvents = taskGroup.events.filter(e => e.status === 'completed' && e.endTime);
      if (completedEvents.length > 0) {
        const latestEndTime = completedEvents
          .map(e => new Date(e.endTime!).getTime())
          .reduce((a, b) => Math.max(a, b), 0);
        taskGroup.endTime = new Date(latestEndTime);
        
        // Aggregate metrics from the completed event
        const completedEvent = completedEvents[completedEvents.length - 1];
        taskGroup.totalDurationMs = completedEvent.totalDurationMs;
        taskGroup.totalTokens = completedEvent.totalTokens;
        taskGroup.inputTokens = completedEvent.inputTokens;
        taskGroup.outputTokens = completedEvent.outputTokens;
        taskGroup.cacheCreationTokens = completedEvent.cacheCreationTokens;
        taskGroup.cacheReadTokens = completedEvent.cacheReadTokens;
        taskGroup.toolUseCount = completedEvent.toolUseCount;
        taskGroup.output = completedEvent.output;
        taskGroup.transcriptPath = completedEvent.transcriptPath;
      }
    } else if (hasFailedEvent) {
      taskGroup.status = 'failed';
    }
    
    // Update start time to be the earliest
    const earliestStart = taskGroup.events
      .map(e => new Date(e.startTime).getTime())
      .reduce((a, b) => Math.min(a, b), new Date(taskGroup.startTime).getTime());
    taskGroup.startTime = new Date(earliestStart);
  });
  
  // Convert to array and sort by start time
  return Array.from(taskGroupMap.values())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map(taskGroup => ({
      taskGroup,
      expanded: expandedNodes.has(`task-${taskGroup.description}`),
    }));
}

/**
 * Build a hierarchical structure organized by session and task description
 */
export function buildSubagentTree(
  subagents: SubagentInfo[], 
  expandedNodes: Set<string>
): Map<string, SessionTree> {
  const sessionMap = new Map<string, SessionTree>();
  
  // Organize subagents by session
  subagents.forEach(subagent => {
    // Get or create session tree
    if (!sessionMap.has(subagent.sessionId)) {
      sessionMap.set(subagent.sessionId, {
        sessionId: subagent.sessionId,
        subagents: [],
        taskGroups: [],
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
    
    // Create node and add to session
    const node: SubagentTreeNode = {
      subagent
    };
    sessionTree.subagents.push(node);
  });
  
  // Sort subagents by start time within each session and create task groups
  sessionMap.forEach(sessionTree => {
    sessionTree.subagents.sort((a, b) => 
      new Date(a.subagent.startTime).getTime() - new Date(b.subagent.startTime).getTime()
    );
    
    // Create task groups for this session
    sessionTree.taskGroups = createTaskGroups(
      sessionTree.subagents.map(n => n.subagent),
      expandedNodes
    );
  });
  
  return sessionMap;
}

/**
 * Get subagents for a session (no longer needs flattening)
 */
export function getSessionSubagents(
  sessionTree: SessionTree
): SubagentTreeNode[] {
  return sessionTree.subagents;
}

/**
 * Get session summary for collapsed view
 */
export function getSessionTreeSummary(sessionTree: SessionTree): string {
  if (sessionTree.subagents.length === 0) {
    return `Session ${sessionTree.sessionId.substring(0, 8)}`;
  }
  
  // Find the most descriptive task
  const descriptions = sessionTree.subagents
    .map(node => node.subagent.description)
    .filter(Boolean);
    
  if (descriptions.length > 0) {
    const longestDesc = descriptions.reduce((a, b) => (a?.length || 0) > (b?.length || 0) ? a : b);
    return longestDesc || `Session ${sessionTree.sessionId.substring(0, 8)}`;
  }
  
  return `Session ${sessionTree.sessionId.substring(0, 8)}`;
}