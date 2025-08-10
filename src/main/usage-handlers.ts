import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { IPC_CHANNELS } from '../shared/constants';
import { ClaudeUsageData } from '../shared/types';

const execAsync = promisify(exec);

/**
 * Check if ccusage command is available
 */
async function checkCcusageCommand(): Promise<{ available: boolean; method: 'direct' | 'npx' | null; path?: string }> {
  // Check common installation paths for ccusage
  const commonPaths = [
    '/opt/homebrew/bin/ccusage',  // Apple Silicon Homebrew
    '/usr/local/bin/ccusage',      // Intel Homebrew
    '/usr/bin/ccusage',             // System
    '/usr/local/opt/ccusage/bin/ccusage'  // Alternative Homebrew location
  ];
  
  // First check if ccusage exists at known paths
  for (const path of commonPaths) {
    if (existsSync(path)) {
      try {
        await execAsync(`${path} --version`);
        return { available: true, method: 'direct', path };
      } catch {
        // File exists but might not be executable
      }
    }
  }
  
  try {
    // Try direct ccusage command (PATH should be fixed by fix-path)
    await execAsync('ccusage --version');
    return { available: true, method: 'direct' };
  } catch {
    try {
      // Fall back to npx
      await execAsync('npx --version');
      // Test if npx can run ccusage
      const { stdout } = await execAsync('npx ccusage@latest --version', { 
        timeout: 30000 // 30 second timeout for npx
      });
      if (stdout) {
        return { available: true, method: 'npx' };
      }
    } catch {
      // Neither method works
    }
  }
  
  return { available: false, method: null };
}

/**
 * Parse ccusage output to extract usage data
 */
function parseCcusageOutput(output: string): ClaudeUsageData {
  const data: ClaudeUsageData = {
    totalCost: 0,
    currency: 'USD',
    period: {
      start: '',
      end: ''
    },
    tokenUsage: {
      input: 0,
      output: 0,
      total: 0
    },
    modelBreakdown: {},
    dailyUsage: []
  };

  // Try to parse JSON output first (if ccusage outputs JSON)
  try {
    const jsonData = JSON.parse(output);
    console.log('Parsed JSON data:', JSON.stringify(jsonData, null, 2));
    
    // Handle the ccusage JSON structure with totals and daily data
    if (jsonData.totals) {
      // Extract total cost and token usage from totals object
      data.totalCost = jsonData.totals.totalCost || 0;
      data.tokenUsage.input = jsonData.totals.inputTokens || 0;
      data.tokenUsage.output = jsonData.totals.outputTokens || 0;
      data.tokenUsage.total = jsonData.totals.totalTokens || 0;
      
      // Handle cache tokens if needed
      if (jsonData.totals.cacheCreationTokens || jsonData.totals.cacheReadTokens) {
        // You might want to include cache tokens in the total
        const cacheTokens = (jsonData.totals.cacheCreationTokens || 0) + (jsonData.totals.cacheReadTokens || 0);
        // Cache tokens are already included in totalTokens
      }
    }

    // Handle daily usage data
    if (jsonData.daily && Array.isArray(jsonData.daily)) {
      // Extract daily usage - showing only the most recent entries
      data.dailyUsage = jsonData.daily.map((day: any) => ({
        date: day.date,
        cost: day.totalCost || 0,
        tokens: day.totalTokens || 0
      }));
      
      // Extract period from daily data
      if (jsonData.daily.length > 0) {
        data.period.start = jsonData.daily[0].date;
        data.period.end = jsonData.daily[jsonData.daily.length - 1].date;
      }
      
      // Build model breakdown from all daily data
      const modelTotals: Record<string, any> = {};
      
      jsonData.daily.forEach((day: any) => {
        if (day.modelBreakdowns && Array.isArray(day.modelBreakdowns)) {
          day.modelBreakdowns.forEach((breakdown: any) => {
            const modelName = breakdown.modelName;
            if (!modelTotals[modelName]) {
              modelTotals[modelName] = {
                requests: 0,
                inputTokens: 0,
                outputTokens: 0,
                cost: 0
              };
            }
            // Aggregate the data
            modelTotals[modelName].requests += 1; // Count days as requests
            modelTotals[modelName].inputTokens += breakdown.inputTokens || 0;
            modelTotals[modelName].outputTokens += breakdown.outputTokens || 0;
            modelTotals[modelName].cost += breakdown.cost || 0;
          });
        }
      });
      
      data.modelBreakdown = modelTotals;
    }

    
    return data;
  } catch (e) {
    // Not JSON, try text parsing
  }

  // Fallback to text parsing
  // Parse total cost - look for various patterns
  let costMatch = output.match(/(?:Total|Cost|Total Cost)[\s:]+\$?([\d,]+\.?\d*)/i);
  if (!costMatch) {
    // Try pattern with currency symbol at end
    costMatch = output.match(/([\d,]+\.?\d*)\s*(?:USD|EUR|GBP)/i);
  }
  if (!costMatch) {
    // Try just finding a dollar amount
    costMatch = output.match(/\$\s*([\d,]+\.?\d*)/);
  }
  if (costMatch) {
    data.totalCost = parseFloat(costMatch[1].replace(/,/g, ''));
  }

  // Parse token usage - more flexible patterns
  const inputPatterns = [
    /Input[\s:]+(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /Input\s+Tokens?[\s:]+(\d+(?:,\d{3})*)/i,
    /(\d+(?:,\d{3})*)\s+input/i
  ];
  
  for (const pattern of inputPatterns) {
    const match = output.match(pattern);
    if (match) {
      data.tokenUsage.input = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }

  const outputPatterns = [
    /Output[\s:]+(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /Output\s+Tokens?[\s:]+(\d+(?:,\d{3})*)/i,
    /(\d+(?:,\d{3})*)\s+output/i
  ];
  
  for (const pattern of outputPatterns) {
    const match = output.match(pattern);
    if (match) {
      data.tokenUsage.output = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Calculate total if not found
  if (data.tokenUsage.input > 0 || data.tokenUsage.output > 0) {
    data.tokenUsage.total = data.tokenUsage.input + data.tokenUsage.output;
  }

  // Parse dates - look for various date formats
  const datePattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2}, \d{4})/g;
  const dates = output.match(datePattern);
  if (dates && dates.length >= 2) {
    data.period.start = dates[0];
    data.period.end = dates[dates.length - 1];
  }

  // Parse model breakdown - look for model names followed by numbers
  const modelPattern = /(claude-[\w-]+|gpt-[\w.-]+|claude\s+\d+(?:\.\d+)?)/gi;
  const models = output.match(modelPattern);
  if (models) {
    models.forEach(model => {
      const modelName = model.replace(/\s+/g, '-').toLowerCase();
      // Try to find associated cost for this model
      const costPattern = new RegExp(`${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^$]*?\\$?([\\d,]+\\.?\\d*)`, 'i');
      const costMatch = output.match(costPattern);
      if (costMatch) {
        data.modelBreakdown![modelName] = {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: parseFloat(costMatch[1].replace(/,/g, ''))
        };
      }
    });
  }

  return data;
}

/**
 * Execute ccusage command and get usage data
 */
async function getCcusageData(method: 'direct' | 'npx', path?: string): Promise<ClaudeUsageData> {
  let command: string;
  
  if (path) {
    // Use the full path if available
    command = `${path} -j`;
  } else {
    command = method === 'direct' ? 'ccusage -j' : 'npx ccusage@latest -j';
  }
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      encoding: 'utf8'
    });

    if (stderr && !stdout) {
      throw new Error(stderr);
    }

    // Debug: Log the raw output to see the format
    console.log('ccusage raw output:', stdout);

    return parseCcusageOutput(stdout);
  } catch (error) {
    throw new Error(`Failed to get usage data: ${(error as Error).message}`);
  }
}

/**
 * Setup IPC handlers for usage operations
 */
export function setupUsageHandlers() {
  // Check if ccusage is available
  ipcMain.handle(IPC_CHANNELS.CHECK_CCUSAGE_AVAILABLE, async () => {
    try {
      const result = await checkCcusageCommand();
      return { success: true, ...result };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        available: false,
        method: null
      };
    }
  });

  // Get usage data
  ipcMain.handle(IPC_CHANNELS.GET_USAGE_DATA, async (_, options?: { raw?: boolean }) => {
    try {
      // First check which method is available
      const { available, method, path } = await checkCcusageCommand();
      
      if (!available || !method) {
        return {
          success: false,
          error: 'ccusage command not available'
        };
      }

      if (options?.raw) {
        // Return raw output for debugging
        let command: string;
        if (path) {
          command = `${path} -j`;
        } else {
          command = method === 'direct' ? 'ccusage -j' : 'npx ccusage@latest -j';
        }
        const { stdout } = await execAsync(command, {
          timeout: 60000,
          encoding: 'utf8'
        });
        return { success: true, rawOutput: stdout };
      }

      const data = await getCcusageData(method, path);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  });
}