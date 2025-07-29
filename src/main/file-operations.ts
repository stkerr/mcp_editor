import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { app } from 'electron';
import { MCPConfiguration, SubagentInfo, GroupedMCPConfiguration } from '../shared/types';
import { CONFIG_PATHS, SUBAGENT_DATA_PATHS } from '../shared/constants';

export function resolvePath(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  
  // Handle Windows environment variables
  if (process.platform === 'win32' && path.includes('%')) {
    return path.replace(/%([^%]+)%/g, (_, envVar) => {
      return process.env[envVar] || '';
    });
  }
  
  return path;
}

export async function ensureDirectoryExists(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function readConfigFile(filePath: string): Promise<MCPConfiguration | null> {
  try {
    const resolvedPath = resolvePath(filePath);
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Handle Claude Code's project-based structure in ~/.claude.json
    if (filePath.includes('.claude.json') && parsed.projects) {
      // Aggregate all MCP servers from all projects
      const aggregatedServers: Record<string, any> = {};
      
      for (const [projectPath, projectConfig] of Object.entries(parsed.projects)) {
        if ((projectConfig as any).mcpServers) {
          const mcpServers = (projectConfig as any).mcpServers;
          for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
            // If server name already exists, add project path as suffix to make it unique
            const uniqueName = aggregatedServers[serverName] 
              ? `${serverName} (${projectPath})` 
              : serverName;
            aggregatedServers[uniqueName] = serverConfig;
          }
        }
      }
      
      return { mcpServers: aggregatedServers };
    }
    
    // Standard format (Claude Desktop)
    return parsed;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // File doesn't exist, return default config
      return { mcpServers: {} };
    }
    throw error;
  }
}

export async function readGroupedConfigFile(filePath: string): Promise<GroupedMCPConfiguration | null> {
  try {
    const resolvedPath = resolvePath(filePath);
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Handle Claude Code's project-based structure in ~/.claude.json
    if (filePath.includes('.claude.json')) {
      const result: GroupedMCPConfiguration = {
        globalServers: {},
        projectServers: {}
      };
      
      // Get global servers from top-level mcpServers
      if (parsed.mcpServers) {
        result.globalServers = parsed.mcpServers;
      }
      
      // Get project-specific servers
      if (parsed.projects) {
        for (const [projectPath, projectConfig] of Object.entries(parsed.projects)) {
          if ((projectConfig as any).mcpServers && Object.keys((projectConfig as any).mcpServers).length > 0) {
            result.projectServers[projectPath] = (projectConfig as any).mcpServers;
          }
        }
      }
      
      return result;
    }
    
    // For Claude Desktop, all servers are "global"
    return {
      globalServers: parsed.mcpServers || {},
      projectServers: {}
    };
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // File doesn't exist, return default config
      return { globalServers: {}, projectServers: {} };
    }
    throw error;
  }
}

export async function writeConfigFile(filePath: string, config: MCPConfiguration): Promise<void> {
  const resolvedPath = resolvePath(filePath);
  await ensureDirectoryExists(resolvedPath);
  
  // Create backup
  try {
    const backupPath = `${resolvedPath}.backup`;
    await fs.copyFile(resolvedPath, backupPath);
  } catch {
    // No existing file to backup
  }
  
  // Handle Claude Code's project-based structure
  if (filePath.includes('.claude.json')) {
    // For Claude Code, we need to preserve the existing structure
    // This is a simplified approach - in a real app, you'd want a project selector
    console.warn('Writing to ~/.claude.json is not fully implemented - would need project selection');
    // For now, just write as standard format (this will break the Claude Code format)
    // TODO: Implement proper project-based writing
  }
  
  await fs.writeFile(resolvedPath, JSON.stringify(config, null, 2));
}

export async function writeGroupedConfigFile(filePath: string, groupedConfig: GroupedMCPConfiguration): Promise<void> {
  const resolvedPath = resolvePath(filePath);
  await ensureDirectoryExists(resolvedPath);
  
  // Create backup
  try {
    const backupPath = `${resolvedPath}.backup`;
    await fs.copyFile(resolvedPath, backupPath);
  } catch (error) {
    console.error('Failed to create backup:', error);
  }
  
  // Handle Claude Code's project-based structure
  if (filePath.includes('.claude.json')) {
    try {
      // Read the existing file to preserve non-MCP data
      const existingContent = await fs.readFile(resolvedPath, 'utf-8');
      const existingData = JSON.parse(existingContent);
      
      // Update the mcpServers at the root level (global servers)
      existingData.mcpServers = groupedConfig.globalServers || {};
      
      // Update project-specific servers
      if (!existingData.projects) {
        existingData.projects = {};
      }
      
      // First, clear all mcpServers from existing projects
      for (const projectPath in existingData.projects) {
        if (existingData.projects[projectPath]) {
          delete existingData.projects[projectPath].mcpServers;
        }
      }
      
      // Then add the servers from our grouped config
      for (const [projectPath, servers] of Object.entries(groupedConfig.projectServers)) {
        if (!existingData.projects[projectPath]) {
          existingData.projects[projectPath] = {};
        }
        if (Object.keys(servers).length > 0) {
          existingData.projects[projectPath].mcpServers = servers;
        }
      }
      
      // Write the merged data back
      await fs.writeFile(resolvedPath, JSON.stringify(existingData, null, 2));
      console.log('Successfully updated Claude Code configuration');
    } catch (error) {
      console.error('Failed to update Claude Code configuration:', error);
      throw error;
    }
  } else {
    // For other apps, just write the global servers as a standard config
    const standardConfig: MCPConfiguration = {
      mcpServers: groupedConfig.globalServers
    };
    await fs.writeFile(resolvedPath, JSON.stringify(standardConfig, null, 2));
  }
}

export function getPlatform(): 'windows' | 'mac' | 'linux' {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'mac';
    default:
      return 'linux';
  }
}

export async function detectInstalledApps(): Promise<string[]> {
  const platform = getPlatform();
  const installedApps: string[] = [];
  
  // Check for Claude Desktop
  try {
    const desktopPath = CONFIG_PATHS.claudeDesktop[platform];
    const resolvedPath = resolvePath(desktopPath);
    console.log('Checking for Claude Desktop at:', resolvedPath);
    
    // Check if config directory exists (not just the file)
    const configDir = dirname(resolvedPath);
    await fs.access(configDir);
    installedApps.push('desktop');
    console.log('Claude Desktop detected!');
  } catch (error) {
    console.log('Claude Desktop not found:', error);
  }
  
  // Check for Claude Code
  try {
    const codePath = CONFIG_PATHS.claudeCode[platform];
    const resolvedPath = resolvePath(codePath);
    console.log('Checking for Claude Code at:', resolvedPath);
    
    // Check if config directory exists (not just the file)
    const configDir = dirname(resolvedPath);
    await fs.access(configDir);
    installedApps.push('code');
    console.log('Claude Code detected!');
  } catch (error) {
    console.log('Claude Code not found:', error);
  }
  
  // If no apps detected, show both as available (user might want to configure before installation)
  if (installedApps.length === 0) {
    console.log('No apps detected, showing both as available for configuration');
    installedApps.push('desktop', 'code');
  }
  
  console.log('Available apps:', installedApps);
  return installedApps;
}

export async function readSubagentData(): Promise<SubagentInfo[]> {
  try {
    let dataPath: string;
    
    if (!app.isPackaged) {
      // Development mode - use dev-data directory
      dataPath = join(app.getAppPath(), 'dev-data/subagents.json');
    } else {
      // Production mode - use userData directory
      dataPath = join(app.getPath('userData'), 'subagents.json');
    }
    
    const resolvedPath = resolvePath(dataPath);
    const content = await fs.readFile(resolvedPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Convert date strings back to Date objects and add missing fields
    return data.map((subagent: any) => ({
      ...subagent,
      startTime: new Date(subagent.startTime),
      endTime: subagent.endTime ? new Date(subagent.endTime) : undefined,
      lastActivity: new Date(subagent.lastActivity),
      // Add default values for new fields if missing
      childIds: subagent.childIds || [],
      depth: subagent.depth ?? 0
    }));
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function writeSubagentData(subagents: SubagentInfo[]): Promise<void> {
  let dataPath: string;
  
  if (!app.isPackaged) {
    // Development mode - use dev-data directory
    dataPath = join(app.getAppPath(), 'dev-data/subagents.json');
  } else {
    // Production mode - use userData directory
    dataPath = join(app.getPath('userData'), 'subagents.json');
  }
  
  const resolvedPath = resolvePath(dataPath);
  console.log('Writing subagent data to:', resolvedPath);
  await ensureDirectoryExists(resolvedPath);
  
  // Create backup
  try {
    const backupPath = `${resolvedPath}.backup`;
    await fs.copyFile(resolvedPath, backupPath);
  } catch {
    // No existing file to backup
  }
  
  await fs.writeFile(resolvedPath, JSON.stringify(subagents, null, 2));
}

export async function addSubagentInfo(subagent: SubagentInfo): Promise<void> {
  const existingData = await readSubagentData();
  
  // For stop events, try to find the matching active subagent
  if (subagent.status === 'completed' && subagent.id.endsWith('-stop')) {
    let matchingSubagent = null;
    
    // First priority: Try to match by correlation ID
    if (subagent.correlationId) {
      matchingSubagent = existingData.find(s => 
        s.correlationId === subagent.correlationId && 
        s.status === 'active'
      );
      
      if (matchingSubagent) {
        console.log(`Found exact match by correlation ID: ${subagent.correlationId}`);
      }
    }
    
    // Second priority: Try description matching if no correlation match
    if (!matchingSubagent) {
      const matchDescription = (subagent as any).matchDescription;
      
      if (matchDescription) {
        // Try exact description match
        matchingSubagent = existingData.find(s => 
          s.sessionId === subagent.sessionId && 
          s.status === 'active' && 
          s.description === matchDescription
        );
      
      if (matchingSubagent) {
        console.log(`Found exact match by description: "${matchDescription}" -> matched to subagent ${matchingSubagent.id}`);
      } else {
        console.log(`No exact match found for description: "${matchDescription}"`);
        // Log what active subagents are available
        const activeOnes = existingData.filter(s => s.sessionId === subagent.sessionId && s.status === 'active');
        console.log(`Active subagents available: ${activeOnes.map(s => `"${s.description}"`).join(', ')}`);
        
        // Try partial matching as a fallback - look for key parts of the description
        // This helps when descriptions might have slight variations
        const descWords = matchDescription.toLowerCase().split(' ');
        matchingSubagent = existingData.find(s => {
          if (s.sessionId !== subagent.sessionId || s.status !== 'active') return false;
          const sDescWords = (s.description || '').toLowerCase().split(' ');
          // Check if most significant words match
          const significantWords = descWords.filter((w: string) => w.length > 3);
          const matches = significantWords.filter((w: string) => sDescWords.includes(w));
          return matches.length >= significantWords.length * 0.7; // 70% match threshold
        });
        
        if (matchingSubagent) {
          console.log(`Found partial match by description: "${matchDescription}" ~= "${matchingSubagent.description}"`);
        }
      }
      }
    } else {
      console.warn('PostToolUse event missing description - cannot reliably match subagent');
      // Without a description, we cannot reliably match the completion event
      // Log this as an error condition
      const activeOnes = existingData.filter(s => s.sessionId === subagent.sessionId && s.status === 'active');
      console.error(`Cannot match completion event without description. ${activeOnes.length} active subagents found.`);
    }
    
    // Third priority: Timestamp-based matching as last resort
    if (!matchingSubagent) {
      // Look for the most recent active subagent with the same tool in the same session
      const toolName = subagent.toolsUsed?.[0] || 'Task';
      const candidateSubagents = existingData
        .filter(s => 
          s.sessionId === subagent.sessionId && 
          s.status === 'active' &&
          s.toolsUsed.includes(toolName)
        )
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      
      if (candidateSubagents.length > 0) {
        // Check if the most recent one started within a reasonable time window (e.g., 30 seconds)
        const mostRecent = candidateSubagents[0];
        const timeDiff = new Date(subagent.endTime!).getTime() - new Date(mostRecent.startTime).getTime();
        
        if (timeDiff > 0 && timeDiff < 30000) { // 30 second window
          matchingSubagent = mostRecent;
          console.log(`Found match by timestamp proximity: ${mostRecent.description} (started ${timeDiff}ms ago)`);
        } else {
          console.log(`Most recent ${toolName} subagent started ${timeDiff}ms ago - too far for reliable matching`);
        }
      }
    }
    
    if (matchingSubagent) {
      // Update the matching subagent
      const existingIndex = existingData.findIndex(s => s.id === matchingSubagent.id);
      if (existingIndex !== -1) {
        existingData[existingIndex] = {
          ...existingData[existingIndex],
          endTime: subagent.endTime,
          status: 'completed',
          lastActivity: new Date(),
          // Merge additional fields from completion event
          totalDurationMs: subagent.totalDurationMs || existingData[existingIndex].totalDurationMs,
          totalTokens: subagent.totalTokens || existingData[existingIndex].totalTokens,
          inputTokens: subagent.inputTokens || existingData[existingIndex].inputTokens,
          outputTokens: subagent.outputTokens || existingData[existingIndex].outputTokens,
          cacheCreationTokens: subagent.cacheCreationTokens || existingData[existingIndex].cacheCreationTokens,
          cacheReadTokens: subagent.cacheReadTokens || existingData[existingIndex].cacheReadTokens,
          toolUseCount: subagent.toolUseCount || existingData[existingIndex].toolUseCount,
          output: subagent.output || existingData[existingIndex].output,
          transcriptPath: subagent.transcriptPath || existingData[existingIndex].transcriptPath,
          // Merge tool input from completion event if not already present
          toolInput: subagent.toolInput || existingData[existingIndex].toolInput
        };
        
        console.log(`Updated subagent "${matchingSubagent.description}" (${matchingSubagent.id}) to completed at ${subagent.endTime}`);
        
        // Don't add a new entry for the stop event
        await writeSubagentData(existingData);
        return;
      }
    } else {
      console.log('No active subagents found to update for stop event');
    }
  }
  
  // For new subagents or if no matching active subagent found
  if (!subagent.id.endsWith('-stop')) {
    existingData.push(subagent);
    console.log(`Added new subagent: ${subagent.description}`);
  }
  
  // Keep only the last 100 entries to avoid file size issues
  const limitedData = existingData.slice(-100);
  
  await writeSubagentData(limitedData);
}

// Moved to after promptHierarchyManager definition

// Enhanced prompt hierarchy management
interface PromptInfo {
  promptId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'interrupted';
  promptText: string;
  duration?: number;
}

const activePrompts = new Map<string, PromptInfo>();
const allPrompts = new Map<string, PromptInfo>();

export const promptHierarchyManager = {
  async handleUserPromptSubmit(sessionId: string, timestamp: string, promptText: string): Promise<string> {
    // Check if there's already an active prompt for this session
    const existingPrompt = activePrompts.get(sessionId);
    if (existingPrompt && existingPrompt.status === 'active') {
      // Mark the existing prompt as interrupted
      existingPrompt.status = 'interrupted';
      existingPrompt.endTime = new Date(timestamp);
      // Calculate and store the duration
      existingPrompt.duration = new Date(timestamp).getTime() - new Date(existingPrompt.startTime).getTime();
      console.log(`Marked prompt ${existingPrompt.promptId} for session ${sessionId} as interrupted with duration ${existingPrompt.duration}ms`);
    }
    
    // Generate a unique prompt ID
    const promptId = `prompt-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the new prompt
    const newPrompt: PromptInfo = {
      promptId,
      sessionId,
      startTime: new Date(timestamp),
      status: 'active',
      promptText
    };
    
    // Store the prompt
    activePrompts.set(sessionId, newPrompt);
    allPrompts.set(promptId, newPrompt);
    
    console.log(`Created new prompt ${promptId} for session ${sessionId}: "${promptText.substring(0, 50)}..."`);
    
    return promptId;
  },

  async handleStopEvent(sessionId: string, timestamp: string): Promise<void> {
    const prompt = activePrompts.get(sessionId);
    if (prompt && prompt.status === 'active') {
      prompt.status = 'completed';
      prompt.endTime = new Date(timestamp);
      // Calculate and store the duration
      prompt.duration = new Date(timestamp).getTime() - new Date(prompt.startTime).getTime();
      console.log(`Marked prompt ${prompt.promptId} for session ${sessionId} as completed with duration ${prompt.duration}ms`);
    } else {
      console.log(`No active prompt found for session ${sessionId}`);
    }
  },
  
  setActivePrompt(sessionId: string, prompt: PromptInfo): void {
    activePrompts.set(sessionId, prompt);
    if (prompt.promptId) {
      allPrompts.set(prompt.promptId, prompt);
    }
  },
  
  getActivePrompt(sessionId: string): PromptInfo | undefined {
    return activePrompts.get(sessionId);
  },
  
  getPromptById(promptId: string): PromptInfo | undefined {
    return allPrompts.get(promptId);
  },
  
  getActivePromptForSession(sessionId: string): string | undefined {
    const prompt = activePrompts.get(sessionId);
    return prompt?.promptId;
  },
  
  getAllPrompts(): PromptInfo[] {
    return Array.from(allPrompts.values());
  },
  
  clearAllPrompts(): void {
    activePrompts.clear();
    allPrompts.clear();
    console.log('Cleared all prompt hierarchy data from memory');
  }
};

// Clear all subagent data
export async function clearSubagentData(): Promise<void> {
  await writeSubagentData([]);
  // Also clear in-memory prompt hierarchy data
  promptHierarchyManager.clearAllPrompts();
}

// Clean up stale active events that have been running for too long
export async function cleanupStaleActiveEvents(maxAgeMinutes: number = 30): Promise<number> {
  try {
    const existingData = await readSubagentData();
    const now = new Date();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    let cleanedCount = 0;
    
    const updatedData = existingData.map(subagent => {
      if (subagent.status === 'active') {
        const age = now.getTime() - new Date(subagent.startTime).getTime();
        
        if (age > maxAgeMs) {
          cleanedCount++;
          console.log(`Marking stale active event as abandoned: ${subagent.description} (age: ${Math.round(age / 60000)}m)`);
          
          return {
            ...subagent,
            status: 'failed' as const,
            endTime: now,
            description: `${subagent.description} (abandoned after ${maxAgeMinutes}m)`,
            lastActivity: now
          };
        }
      }
      
      return subagent;
    });
    
    if (cleanedCount > 0) {
      await writeSubagentData(updatedData);
      console.log(`Cleaned up ${cleanedCount} stale active events`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up stale events:', error);
    return 0;
  }
}

// Make promptHierarchyManager available globally for the webhook server
(global as any).promptHierarchyManager = promptHierarchyManager;
