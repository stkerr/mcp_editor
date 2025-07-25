/**
 * Mapping of tool names to appropriate emojis for visual identification
 */

export const toolEmojis: Record<string, string> = {
  // Subagent/Task tools
  'Task': '🤖',
  
  // File operations
  'Read': '📝',
  'Write': '📝',
  'Edit': '📝',
  'MultiEdit': '📝',
  
  // Command line
  'Bash': '💻',
  
  // Search operations
  'Grep': '🔍',
  'Search': '🔍',
  'Glob': '🔍',
  'LS': '🔍',
  
  // Web operations
  'WebSearch': '🌐',
  'WebFetch': '🌐',
  
  // Git operations
  'Git': '🔀',
  
  // Task management
  'TodoWrite': '✅',
  
  // Planning
  'ExitPlanMode': '📋',
  
  // Notebook operations
  'NotebookRead': '📓',
  'NotebookEdit': '📓',
  
  // Special events
  'UserPromptSubmit': '⚡',
  'Stop': '✅',
};

/**
 * Get the appropriate emoji for a tool name
 * @param toolName The name of the tool
 * @returns The emoji for the tool, or the default emoji if not found
 */
export function getToolEmoji(toolName: string | undefined): string {
  if (!toolName) {
    return '🛠️'; // Default emoji
  }
  
  // Direct match
  if (toolEmojis[toolName]) {
    return toolEmojis[toolName];
  }
  
  // Case-insensitive match
  const lowerToolName = toolName.toLowerCase();
  for (const [key, emoji] of Object.entries(toolEmojis)) {
    if (key.toLowerCase() === lowerToolName) {
      return emoji;
    }
  }
  
  // Partial match for compound tool names (e.g., "GitCommit" would match "Git")
  for (const [key, emoji] of Object.entries(toolEmojis)) {
    if (toolName.includes(key) || key.includes(toolName)) {
      return emoji;
    }
  }
  
  // Default emoji for unknown tools
  return '🛠️';
}

/**
 * Get the emoji for a task group based on its events
 * @param events Array of subagent events in the task group
 * @returns The most appropriate emoji for the task group
 */
export function getTaskGroupEmoji(events: Array<{ toolsUsed: string[] }>): string {
  if (events.length === 0) {
    return '🛠️';
  }
  
  // Use the first event's first tool as the primary indicator
  const firstEvent = events[0];
  if (firstEvent.toolsUsed && firstEvent.toolsUsed.length > 0) {
    return getToolEmoji(firstEvent.toolsUsed[0]);
  }
  
  // If no tools found, return default
  return '🛠️';
}