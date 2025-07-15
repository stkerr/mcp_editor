import { SubagentInfo } from '../shared/types';

interface ActiveSubagent {
  id: string;
  sessionId: string;
  startTime: Date;
  depth: number;
}

/**
 * Tracks active subagents to infer parent-child relationships
 */
export class SubagentTracker {
  // Map of sessionId to stack of active subagents
  private activeSubagentsBySession = new Map<string, ActiveSubagent[]>();
  
  /**
   * Get the potential parent for a new subagent based on timing
   */
  getParentForNewSubagent(sessionId: string, newSubagentStartTime: Date): { parentId: string | undefined; depth: number } {
    const sessionStack = this.activeSubagentsBySession.get(sessionId) || [];
    
    // Find the most recent active subagent that started before this one
    // Iterate from the end (most recent) to find the deepest possible parent
    for (let i = sessionStack.length - 1; i >= 0; i--) {
      const candidate = sessionStack[i];
      if (new Date(candidate.startTime) < new Date(newSubagentStartTime)) {
        return { 
          parentId: candidate.id, 
          depth: candidate.depth + 1 
        };
      }
    }
    
    // No parent found, this is a root task
    return { parentId: undefined, depth: 0 };
  }
  
  /**
   * Register a new active subagent
   */
  addActiveSubagent(subagent: SubagentInfo): void {
    const sessionStack = this.activeSubagentsBySession.get(subagent.sessionId) || [];
    
    sessionStack.push({
      id: subagent.id,
      sessionId: subagent.sessionId,
      startTime: subagent.startTime,
      depth: subagent.depth
    });
    
    this.activeSubagentsBySession.set(subagent.sessionId, sessionStack);
  }
  
  /**
   * Mark a subagent as completed and remove from active tracking
   */
  completeSubagent(sessionId: string, subagentId: string): void {
    const sessionStack = this.activeSubagentsBySession.get(sessionId);
    if (!sessionStack) return;
    
    // Remove all subagents that match this ID or started after it
    // (children should complete before parents)
    const index = sessionStack.findIndex(s => s.id === subagentId);
    if (index !== -1) {
      sessionStack.splice(index, 1);
    }
    
    // Clean up empty session stacks
    if (sessionStack.length === 0) {
      this.activeSubagentsBySession.delete(sessionId);
    }
  }
  
  /**
   * Get all active subagents for a session
   */
  getActiveSubagentsForSession(sessionId: string): ActiveSubagent[] {
    return this.activeSubagentsBySession.get(sessionId) || [];
  }
  
  /**
   * Clear all tracking data
   */
  clear(): void {
    this.activeSubagentsBySession.clear();
  }
}