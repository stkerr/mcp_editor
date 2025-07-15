import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { app } from 'electron';
import { MCPConfiguration, SubagentInfo } from '../shared/types';
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
    return JSON.parse(content);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // File doesn't exist, return default config
      return { mcpServers: {} };
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
  
  await fs.writeFile(resolvedPath, JSON.stringify(config, null, 2));
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
    
    // Convert date strings back to Date objects
    return data.map((subagent: any) => ({
      ...subagent,
      startTime: new Date(subagent.startTime),
      endTime: subagent.endTime ? new Date(subagent.endTime) : undefined,
      lastActivity: new Date(subagent.lastActivity)
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
    // We MUST have a description from PostToolUse to match properly
    const matchDescription = (subagent as any).matchDescription;
    let matchingSubagent = null;
    
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
          const sDescWords = s.description.toLowerCase().split(' ');
          // Check if most significant words match
          const significantWords = descWords.filter(w => w.length > 3);
          const matches = significantWords.filter(w => sDescWords.includes(w));
          return matches.length >= significantWords.length * 0.7; // 70% match threshold
        });
        
        if (matchingSubagent) {
          console.log(`Found partial match by description: "${matchDescription}" ~= "${matchingSubagent.description}"`);
        }
      }
    } else {
      console.warn('PostToolUse event missing description - cannot reliably match subagent');
      // Without a description, we cannot reliably match the completion event
      // Log this as an error condition
      const activeOnes = existingData.filter(s => s.sessionId === subagent.sessionId && s.status === 'active');
      console.error(`Cannot match completion event without description. ${activeOnes.length} active subagents found.`);
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

export async function clearSubagentData(): Promise<void> {
  await writeSubagentData([]);
}
