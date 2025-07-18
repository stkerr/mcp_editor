import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { BrowserWindow } from 'electron';
import { SubagentInfo } from '../shared/types';
import { addSubagentInfo } from './subagent-queue';
import { IPC_CHANNELS } from '../shared/constants';

interface WebhookEvent {
  sessionId: string;
  toolInput?: any;
  toolOutput?: any;
  eventType: 'subagent-stop' | 'tool-use' | 'notification' | 'stop';
  timestamp: string;
  transcriptPath?: string;
}

export class WebhookServer {
  private server: Server | null = null;
  private port: number = 3001;

  constructor(port: number = 3001) {
    this.port = port;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.handleRequest.bind(this));
      
      this.server.listen(this.port, 'localhost', () => {
        console.log(`Webhook server listening on http://localhost:${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('Webhook server error:', error);
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Webhook server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = parse(req.url || '', true);
    const pathname = parsedUrl.pathname;

    try {
      if (req.method === 'POST' && (pathname === '/subagent-event' || pathname === '/tool-event' || pathname === '/stop-event')) {
        await this.handleWebhookEvent(req, res);
      } else if (req.method === 'GET' && pathname === '/health') {
        this.handleHealthCheck(res);
      } else if (req.method === 'POST' && pathname === '/test') {
        this.handleTestWebhook(res);
      } else {
        this.sendResponse(res, 404, { error: 'Not found' });
      }
    } catch (error) {
      console.error('Error handling webhook request:', error);
      this.sendResponse(res, 500, { error: 'Internal server error' });
    }
  }

  private async handleWebhookEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readRequestBody(req);
    const receivedAt = new Date().toISOString();
    console.log(`\n=== Webhook received at ${receivedAt} ===`);
    console.log('URL:', req.url);
    console.log('Raw body:', body);
    
    try {
      // Parse the JSON body
      const parsedBody = JSON.parse(body);
      console.log('Hook event name:', parsedBody.hook_event_name);
      console.log('Tool name:', parsedBody.tool_name);
      if (parsedBody.tool_input?.description) {
        console.log('Description:', parsedBody.tool_input.description);
      }
      
      // Convert to our internal WebhookEvent format
      const eventData = this.parseHookInput(parsedBody);
      console.log('Event type determined:', eventData.eventType);
      
      await this.processWebhookEvent(eventData);
      this.sendResponse(res, 200, { success: true, message: 'Event processed' });
    } catch (error) {
      console.error('Error processing webhook event:', error);
      this.sendResponse(res, 400, { error: 'Invalid event data' });
    }
  }

  private parseHookInput(hookInput: any): WebhookEvent {
    // Parse the hook input from Claude Code
    // The structure depends on the specific hook type
    const sessionId = hookInput.session_id || 'unknown';
    const timestamp = new Date().toISOString();
    
    // Determine event type from the hook data
    let eventType: WebhookEvent['eventType'] = 'tool-use';
    
    // Check various ways the event type might be specified
    if (hookInput.event_type === 'Stop' || 
        hookInput.hook_event_name === 'Stop' ||
        hookInput.hook_event === 'Stop') {
      eventType = 'stop';
    } else if (hookInput.event_type === 'SubagentStop' || 
        hookInput.hook_event_name === 'SubagentStop' ||
        hookInput.hook_event === 'SubagentStop') {
      eventType = 'subagent-stop';
    } else if (hookInput.hook_event_name === 'PostToolUse' && 
               hookInput.tool_name === 'Task') {
      // PostToolUse with Task tool indicates a subagent completed
      eventType = 'subagent-stop';
      console.log('Detected PostToolUse for Task - treating as subagent completion');
    } else if (hookInput.hook_event_name === 'PreToolUse' && 
               hookInput.tool_name === 'Task') {
      // PreToolUse with Task tool indicates a subagent is starting
      eventType = 'tool-use';
    }

    // Build the tool input object, including tool_name from the root if available
    const toolInput = hookInput.tool_input || {};
    if (hookInput.tool_name && !toolInput.tool_name) {
      toolInput.tool_name = hookInput.tool_name;
    }

    // Store the hook event name for later processing
    const result: any = {
      sessionId,
      toolInput,
      toolOutput: hookInput.tool_response || hookInput.tool_output,
      eventType,
      timestamp,
      transcriptPath: hookInput.transcript_path,
      hookEventName: hookInput.hook_event_name
    };

    // For PostToolUse, extract the task description from tool_input
    if (hookInput.hook_event_name === 'PostToolUse' && toolInput.description) {
      result.taskDescription = toolInput.description;
      console.log(`PostToolUse captured description: "${toolInput.description}"`);
    } else if (hookInput.hook_event_name === 'PostToolUse') {
      console.warn('PostToolUse event missing description in tool_input:', toolInput);
    }

    return result;
  }

  private async processWebhookEvent(eventData: WebhookEvent): Promise<void> {
    console.log('Processing webhook event:', eventData);

    if (eventData.eventType === 'subagent-stop') {
      // For subagent-stop, we need to find the matching subagent
      const description = (eventData as any).taskDescription || this.extractDescription(eventData);
      
      if (!description || description === 'subagent-stop event') {
        console.error('PostToolUse event has no meaningful description - cannot match subagent');
      }
      
      // Extract additional data from PostToolUse event
      const toolOutput = eventData.toolOutput || {};
      const totalDurationMs = toolOutput.totalDurationMs || undefined;
      const totalTokens = toolOutput.totalTokens || undefined;
      const inputTokens = toolOutput.input_tokens || undefined;
      const outputTokens = toolOutput.output_tokens || undefined;
      const cacheCreationTokens = toolOutput.cache_creation_input_tokens || undefined;
      const cacheReadTokens = toolOutput.cache_read_input_tokens || undefined;
      const toolUseCount = toolOutput.totalToolUseCount || undefined;
      
      // Extract output content
      let output = undefined;
      if (toolOutput.content && Array.isArray(toolOutput.content)) {
        output = toolOutput.content.map((item: any) => {
          if (typeof item === 'string') return item;
          if (item.type === 'text' && item.text) return item.text;
          return JSON.stringify(item);
        }).join('\n');
      } else if (typeof toolOutput === 'string') {
        output = toolOutput;
      }
      
      const subagentInfo: SubagentInfo = {
        id: `${eventData.sessionId}-${Date.now()}-stop`, // Temporary ID for matching
        sessionId: eventData.sessionId,
        startTime: new Date(eventData.timestamp), // Will be merged with existing start time
        endTime: new Date(eventData.timestamp),
        status: 'completed',
        description: description,
        toolsUsed: this.extractToolsUsed(eventData),
        lastActivity: new Date(eventData.timestamp),
        // Additional fields
        totalDurationMs,
        totalTokens,
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
        toolUseCount,
        output,
        transcriptPath: eventData.transcriptPath,
        toolInput: eventData.toolInput,
        // Store the description to help with matching
        matchDescription: description
      } as SubagentInfo;

      console.log('Processing subagent completion:', {
        description: description,
        sessionId: eventData.sessionId,
        timestamp: eventData.timestamp
      });
      
      try {
        await addSubagentInfo(subagentInfo);
        console.log('Subagent completion processed successfully');
        this.notifyRenderer(subagentInfo);
      } catch (error) {
        console.error('Failed to process subagent completion:', error);
      }
    } else if (eventData.eventType === 'tool-use') {
      // Handle tool use events - create unique ID
      const description = this.extractDescription(eventData);
      const timestamp = Date.now();
      const uniqueId = `${eventData.sessionId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      
      const subagentInfo: SubagentInfo = {
        id: uniqueId, // Unique ID for each subagent
        sessionId: eventData.sessionId,
        startTime: new Date(eventData.timestamp),
        status: 'active',
        description: description,
        toolsUsed: this.extractToolsUsed(eventData),
        lastActivity: new Date(eventData.timestamp),
        toolInput: eventData.toolInput
      };

      console.log('Creating new subagent:', {
        id: uniqueId,
        description: description,
        sessionId: eventData.sessionId
      });
      
      try {
        await addSubagentInfo(subagentInfo);
        console.log('New subagent created successfully');
        this.notifyRenderer(subagentInfo);
      } catch (error) {
        console.error('Failed to create new subagent:', error);
      }
    } else if (eventData.eventType === 'stop') {
      // Handle Stop event - mark the active prompt as completed
      console.log('Processing Stop event for session:', eventData.sessionId);
      
      try {
        // Get the prompt hierarchy manager instance
        const promptManager = (global as any).promptHierarchyManager;
        if (promptManager) {
          await promptManager.handleStopEvent(eventData.sessionId, eventData.timestamp);
          console.log('Stop event processed successfully');
        } else {
          console.error('PromptHierarchyManager not available');
        }
      } catch (error) {
        console.error('Failed to process Stop event:', error);
      }
    } else {
      console.log('Unknown event type, not saving:', eventData.eventType);
    }
  }

  private extractDescription(eventData: WebhookEvent): string {
    if (eventData.toolInput?.description) {
      return eventData.toolInput.description;
    }
    if (eventData.toolInput?.prompt) {
      return eventData.toolInput.prompt.substring(0, 100) + '...';
    }
    return `${eventData.eventType} event`;
  }

  private extractToolsUsed(eventData: WebhookEvent): string[] {
    const tools: string[] = [];
    
    // Check for tool name in various places
    if (eventData.toolInput?.tool_name) {
      tools.push(eventData.toolInput.tool_name);
    }
    
    // For PreToolUse events, the tool name might be at the root level
    if ((eventData as any).tool_name) {
      tools.push((eventData as any).tool_name);
    }
    
    if (eventData.toolOutput?.tools_used) {
      tools.push(...eventData.toolOutput.tools_used);
    }

    return [...new Set(tools)]; // Remove duplicates
  }

  private handleHealthCheck(res: ServerResponse): void {
    this.sendResponse(res, 200, { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      port: this.port
    });
  }

  private handleTestWebhook(res: ServerResponse): void {
    console.log('Test webhook endpoint called');
    this.sendResponse(res, 200, { 
      success: true,
      message: 'Test webhook received',
      timestamp: new Date().toISOString()
    });
  }

  private async readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  private sendResponse(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private notifyRenderer(subagentInfo: SubagentInfo): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.SUBAGENT_UPDATE, subagentInfo);
      }
    });
  }

  getPort(): number {
    return this.port;
  }
}