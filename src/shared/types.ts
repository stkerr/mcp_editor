export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPConfiguration {
  mcpServers: {
    [serverName: string]: MCPServerConfig;
  };
}

export type AppType = 'desktop' | 'code';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ConfigPaths {
  windows: string;
  mac: string;
  linux: string;
}

export type ViewType = 'servers' | 'subagents';

export interface SubagentInfo {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed';
  description?: string;
  toolsUsed: string[];
  lastActivity: Date;
  // Parent-child relationship tracking
  parentId?: string;
  childIds: string[];
  depth: number; // 0 for root tasks, 1 for direct children, etc.
  // Additional fields from webhook data
  totalDurationMs?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  toolUseCount?: number;
  output?: string;
  transcriptPath?: string;
  toolInput?: any; // Store the full tool input for display
}

export interface HookConfig {
  type: 'command';
  command: string;
}

export interface HookMatcher {
  matcher: string;
  hooks: HookConfig[];
}

export interface ClaudeCodeHooks {
  PreToolUse?: HookMatcher[];
  PostToolUse?: HookMatcher[];
  Notification?: HookMatcher[];
  Stop?: HookMatcher[];
  SubagentStop?: HookMatcher[];
  PreCompact?: HookMatcher[];
}

// Session grouping for hierarchical display
export interface SubagentSession {
  sessionId: string;
  subagents: SubagentInfo[];
  expanded: boolean;
  firstSeen: Date;
  lastActivity: Date;
  totalDuration: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
}
