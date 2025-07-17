import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ClaudeCodeHooks, HookMatcher, HookConfig } from '../shared/types';

interface ClaudeCodeConfig {
  mcpServers?: Record<string, any>;
  projects?: Record<string, any>;
  hooks?: ClaudeCodeHooks;
  [key: string]: any;
}

/**
 * Returns the path to ~/.claude/settings.json (handles platform-specific home directory)
 */
export function getClaudeCodeConfigPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}

/**
 * Reads and parses the config file, returns empty object if not exists
 */
export async function readClaudeCodeConfig(): Promise<ClaudeCodeConfig> {
  try {
    const configPath = getClaudeCodeConfigPath();
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // File doesn't exist, return empty config
      return {};
    }
    throw error;
  }
}

/**
 * Compares two hooks to check if they are duplicates
 */
function areHooksEqual(hook1: HookConfig, hook2: HookConfig): boolean {
  // Compare type and command
  if (hook1.type !== hook2.type || hook1.command !== hook2.command) {
    return false;
  }
  
  // For command type hooks, we only need to compare type and command
  return true;
}

/**
 * Compares two hook matchers to check if they are duplicates
 */
function areHookMatchersEqual(matcher1: HookMatcher, matcher2: HookMatcher): boolean {
  // Compare matcher patterns
  if (matcher1.matcher !== matcher2.matcher) {
    return false;
  }
  
  // Compare hooks arrays
  if (matcher1.hooks.length !== matcher2.hooks.length) {
    return false;
  }
  
  // Check if all hooks in matcher1 exist in matcher2
  for (const hook1 of matcher1.hooks) {
    const hasMatch = matcher2.hooks.some(hook2 => areHooksEqual(hook1, hook2));
    if (!hasMatch) {
      return false;
    }
  }
  
  return true;
}

/**
 * Merges new hooks without duplicates
 * For each hook type (SubagentStop, PreToolUse, PostToolUse), check if hooks already exist
 * Compare hooks by their key properties (pattern, command, args) to avoid duplicates
 * Preserve existing hooks that aren't duplicates
 */
export function mergeHooksConfiguration(
  existingConfig: ClaudeCodeConfig,
  newHooks: ClaudeCodeHooks
): ClaudeCodeConfig {
  const mergedConfig = { ...existingConfig };
  
  // Initialize hooks if not present
  if (!mergedConfig.hooks) {
    mergedConfig.hooks = {};
  }
  
  // Hook types to process
  const hookTypes: (keyof ClaudeCodeHooks)[] = [
    'PreToolUse',
    'PostToolUse',
    'Notification',
    'Stop',
    'SubagentStop',
    'PreCompact'
  ];
  
  for (const hookType of hookTypes) {
    const newHookMatchers = newHooks[hookType];
    if (!newHookMatchers || newHookMatchers.length === 0) {
      continue;
    }
    
    // Initialize hook type array if not present
    if (!mergedConfig.hooks[hookType]) {
      mergedConfig.hooks[hookType] = [];
    }
    
    const existingMatchers = mergedConfig.hooks[hookType] || [];
    
    // Add new hook matchers that don't already exist
    for (const newMatcher of newHookMatchers) {
      const isDuplicate = existingMatchers.some(existingMatcher => 
        areHookMatchersEqual(existingMatcher, newMatcher)
      );
      
      if (!isDuplicate) {
        existingMatchers.push(newMatcher);
      }
    }
    
    mergedConfig.hooks[hookType] = existingMatchers;
  }
  
  return mergedConfig;
}

/**
 * Creates a backup with timestamp
 */
export async function createConfigBackup(configPath: string): Promise<string> {
  try {
    // Check if config file exists
    await fs.access(configPath);
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = `${configPath}.backup-${timestamp}`;
    
    // Copy file to backup
    await fs.copyFile(configPath, backupPath);
    
    return backupPath;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // File doesn't exist, no need to backup
      return '';
    }
    throw error;
  }
}

/**
 * Writes the config with proper formatting
 */
export async function writeClaudeCodeConfig(
  configPath: string,
  config: ClaudeCodeConfig
): Promise<void> {
  // Ensure the directory exists
  const dir = join(configPath, '..');
  await fs.mkdir(dir, { recursive: true });
  
  // Ensure the config is properly formatted with 2-space indentation
  const configContent = JSON.stringify(config, null, 2);
  
  // Write the config file
  await fs.writeFile(configPath, configContent, 'utf-8');
}

/**
 * Checks if specific hooks are already configured
 */
export async function checkHooksConfigured(hooksToCheck: ClaudeCodeHooks): Promise<boolean> {
  try {
    const config = await readClaudeCodeConfig();
    
    if (!config.hooks) {
      return false;
    }
    
    // Check each hook type in hooksToCheck
    for (const [hookType, matchers] of Object.entries(hooksToCheck)) {
      if (!matchers || matchers.length === 0) {
        continue;
      }
      
      const existingMatchers = config.hooks[hookType as keyof ClaudeCodeHooks];
      if (!existingMatchers) {
        return false;
      }
      
      // Check if all matchers in hooksToCheck exist in the config
      for (const matcher of matchers) {
        const exists = existingMatchers.some(existingMatcher => 
          areHookMatchersEqual(existingMatcher, matcher)
        );
        
        if (!exists) {
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    // If we can't read the config, assume hooks are not configured
    return false;
  }
}