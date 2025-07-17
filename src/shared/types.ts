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

// Extended configuration for grouped display
export interface GroupedMCPConfiguration {
  globalServers: {
    [serverName: string]: MCPServerConfig;
  };
  projectServers: {
    [projectPath: string]: {
      [serverName: string]: MCPServerConfig;
    };
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

export type ViewType = 'servers' | 'subagents' | 'usage';

export interface SubagentInfo {
  id: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed';
  description?: string;
  toolsUsed: string[];
  lastActivity: Date;
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

// Task grouping - represents related PreToolUse/PostToolUse events
export interface TaskGroup {
  description: string;
  events: SubagentInfo[];  // Array of related events (typically PreToolUse and PostToolUse)
  status: 'active' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  // Aggregated metrics
  totalDurationMs?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  toolUseCount?: number;
  output?: string;
  transcriptPath?: string;
}

// Session grouping for hierarchical display
export interface SubagentSession {
  sessionId: string;
  subagents: SubagentInfo[];
  taskGroups: TaskGroup[];  // New: grouped by description
  expanded: boolean;
  firstSeen: Date;
  lastActivity: Date;
  totalDuration: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
}

// Claude usage data interfaces
export interface ClaudeUsageData {
  totalCost: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  modelBreakdown?: {
    [model: string]: {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    };
  };
  dailyUsage?: {
    date: string;
    cost: number;
    tokens: number;
  }[];
}
