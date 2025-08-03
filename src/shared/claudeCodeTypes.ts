/**
 * Shared types for Claude Code DAG functionality
 * These types are used in both main and renderer processes
 */

/**
 * Enum of all expected webhook event types from Claude Code
 */
export enum ClaudeCodeEventType {
  PreToolUse = 'PreToolUse',
  PostToolUse = 'PostToolUse',
  Notification = 'Notification',
  UserPromptSubmit = 'UserPromptSubmit',
  Stop = 'Stop',
  SubagentStop = 'SubagentStop',
  PreCompact = 'PreCompact',
  SessionStart = 'SessionStart',
  Unknown = 'Unknown' // For handling unexpected event types gracefully
}

/**
 * Flexible node structure that can represent any event in the Claude Code session
 */
export interface SessionNode {
  // Required fields as specified in the comments
  id: string;
  timeReceived: Date;
  eventType: ClaudeCodeEventType;
  rawBody: any; // Raw event data
  sessionId: string;
  parentId?: string; // Optional - root nodes won't have this
  childIds: string[]; // List of child node IDs
  
  // Additional flexible properties can be added here
  [key: string]: any;
}