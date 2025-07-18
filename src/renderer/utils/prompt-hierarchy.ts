import { SubagentInfo, TaskGroup } from '../../shared/types';

export interface PromptInfo {
  promptId: string;
  promptText: string;
  sessionId: string;
  startTime: Date;
  status: 'active' | 'completed' | 'interrupted';
  duration?: number;
  totalTokens?: number;
}

export interface PromptTreeNode {
  prompt: PromptInfo;
  events: SubagentInfo[];
  taskGroups: TaskGroupNode[];
  expanded: boolean;
  activeCount: number;
  completedCount: number;
  failedCount: number;
}

export interface TaskGroupNode {
  taskGroup: TaskGroup;
  expanded: boolean;
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
        status: subagent.status || 'active', // Use subagent's status, default to 'active'
        startTime: subagent.startTime,
        endTime: undefined
      });
    }
    
    const taskGroup = taskGroupMap.get(description)!;
    taskGroup.events.push(subagent);
    
    // Update task group based on events
    const hasCompletedEvent = taskGroup.events.some(e => e.status === 'completed');
    const hasFailedEvent = taskGroup.events.some(e => e.status === 'failed');
    const allEmptyStatus = taskGroup.events.every(e => e.status === '');
    
    if (allEmptyStatus) {
      // If all events have empty status, set task group status to empty
      taskGroup.status = '';
    } else if (hasCompletedEvent) {
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
 * Build a hierarchical structure organized by UserPromptSubmit
 */
export function buildPromptHierarchy(
  subagents: SubagentInfo[],
  prompts: PromptInfo[],
  expandedNodes: Set<string>
): PromptTreeNode[] {
  const promptNodes: PromptTreeNode[] = [];
  const promptMap = new Map<string, PromptInfo>();
  
  // Create a map of prompts by ID
  prompts.forEach(prompt => {
    promptMap.set(prompt.promptId, prompt);
  });
  
  // Group subagents by parentPromptId
  const eventsByPrompt = new Map<string, SubagentInfo[]>();
  const orphanedEvents: SubagentInfo[] = [];
  
  subagents.forEach(subagent => {
    if (subagent.parentPromptId && promptMap.has(subagent.parentPromptId)) {
      if (!eventsByPrompt.has(subagent.parentPromptId)) {
        eventsByPrompt.set(subagent.parentPromptId, []);
      }
      eventsByPrompt.get(subagent.parentPromptId)!.push(subagent);
    } else {
      // Event without a parent prompt or with unknown prompt
      orphanedEvents.push(subagent);
    }
  });
  
  // Create prompt nodes
  prompts.forEach(prompt => {
    const events = eventsByPrompt.get(prompt.promptId) || [];
    
    // Calculate counts
    let activeCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let totalTokens = 0;
    
    events.forEach(event => {
      switch (event.status) {
        case 'active':
          activeCount++;
          break;
        case 'completed':
          completedCount++;
          if (event.totalTokens) {
            totalTokens += event.totalTokens;
          }
          break;
        case 'failed':
          failedCount++;
          break;
        case '':
          // Don't count empty status events
          break;
      }
    });
    
    // Update prompt info with aggregated data
    const promptWithMetrics: PromptInfo = {
      ...prompt,
      totalTokens: totalTokens > 0 ? totalTokens : undefined
    };
    
    const promptNode: PromptTreeNode = {
      prompt: promptWithMetrics,
      events,
      taskGroups: createTaskGroups(events, expandedNodes),
      expanded: expandedNodes.has(prompt.promptId),
      activeCount,
      completedCount,
      failedCount
    };
    
    promptNodes.push(promptNode);
  });
  
  // Handle orphaned events - group by session
  const orphanedBySession = new Map<string, SubagentInfo[]>();
  orphanedEvents.forEach(event => {
    if (!orphanedBySession.has(event.sessionId)) {
      orphanedBySession.set(event.sessionId, []);
    }
    orphanedBySession.get(event.sessionId)!.push(event);
  });
  
  // Create synthetic prompt nodes for orphaned events
  orphanedBySession.forEach((events, sessionId) => {
    const legacyPrompt: PromptInfo = {
      promptId: `legacy-${sessionId}`,
      promptText: `Legacy Session ${sessionId.substring(0, 8)}`,
      sessionId,
      startTime: new Date(Math.min(...events.map(e => new Date(e.startTime).getTime()))),
      status: 'completed'
    };
    
    // Calculate counts
    let activeCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    
    events.forEach(event => {
      switch (event.status) {
        case 'active':
          activeCount++;
          break;
        case 'completed':
          completedCount++;
          break;
        case 'failed':
          failedCount++;
          break;
        case '':
          // Don't count empty status events
          break;
      }
    });
    
    const promptNode: PromptTreeNode = {
      prompt: legacyPrompt,
      events,
      taskGroups: createTaskGroups(events, expandedNodes),
      expanded: expandedNodes.has(legacyPrompt.promptId),
      activeCount,
      completedCount,
      failedCount
    };
    
    promptNodes.push(promptNode);
  });
  
  // Sort by most recent first
  return promptNodes.sort((a, b) => 
    new Date(b.prompt.startTime).getTime() - new Date(a.prompt.startTime).getTime()
  );
}

/**
 * Format prompt duration
 */
export function formatPromptDuration(prompt: PromptInfo): string {
  if (prompt.duration) {
    const seconds = Math.floor(prompt.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
  return '';
}