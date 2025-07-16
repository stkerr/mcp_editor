import { SubagentInfo, SubagentSession } from '../../shared/types';

/**
 * Groups subagents by session ID for hierarchical display
 */
export function groupSubagentsBySession(
  subagents: SubagentInfo[], 
  expandedSessions: Set<string>
): SubagentSession[] {
  const sessionMap = new Map<string, SubagentSession>();

  // Group subagents by sessionId
  subagents.forEach(subagent => {
    const sessionId = subagent.sessionId;
    
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, {
        sessionId,
        subagents: [],
        expanded: expandedSessions.has(sessionId),
        firstSeen: subagent.startTime,
        lastActivity: subagent.lastActivity,
        totalDuration: 0,
        activeCount: 0,
        completedCount: 0,
        failedCount: 0
      });
    }

    const session = sessionMap.get(sessionId)!;
    session.subagents.push(subagent);
    
    // Update session statistics
    if (new Date(subagent.startTime) < new Date(session.firstSeen)) {
      session.firstSeen = subagent.startTime;
    }
    if (new Date(subagent.lastActivity) > new Date(session.lastActivity)) {
      session.lastActivity = subagent.lastActivity;
    }
    
    // Count by status
    switch (subagent.status) {
      case 'active':
        session.activeCount++;
        break;
      case 'completed':
        session.completedCount++;
        if (subagent.totalDurationMs) {
          session.totalDuration += subagent.totalDurationMs;
        }
        break;
      case 'failed':
        session.failedCount++;
        break;
    }
  });

  // Sort sessions by most recent activity
  const sessions = Array.from(sessionMap.values());
  sessions.sort((a, b) => 
    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  // Sort subagents within each session by startTime
  sessions.forEach(session => {
    session.subagents.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  });

  return sessions;
}

/**
 * Gets a summary description for a session
 */
export function getSessionSummary(session: SubagentSession): string {
  const totalTasks = session.subagents.length;
  const firstTask = session.subagents[0];
  
  if (totalTasks === 1) {
    return firstTask.description || `Session ${session.sessionId.substring(0, 8)}`;
  }
  
  // For multiple tasks, try to find the most descriptive task
  const descriptions = session.subagents
    .map(s => s.description)
    .filter(Boolean);
    
  if (descriptions.length > 0) {
    // Find the longest description as it's likely most descriptive
    const longestDesc = descriptions.reduce((a, b) => (a?.length || 0) > (b?.length || 0) ? a : b);
    if (totalTasks > 1) {
      return `${longestDesc}`;
    }
    return longestDesc || `Session ${session.sessionId.substring(0, 8)}`;
  }
  
  return `Session ${session.sessionId.substring(0, 8)}`;
}

/**
 * Formats session duration
 */
export function formatSessionDuration(session: SubagentSession): string {
  const firstTime = new Date(session.firstSeen).getTime();
  const lastTime = new Date(session.lastActivity).getTime();
  const duration = lastTime - firstTime;
  
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}