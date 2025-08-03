import { v4 as uuidv4 } from 'uuid';
import { ClaudeCodeEventType, SessionNode } from '../../shared/claudeCodeTypes';

/**
 * Main data structure for managing Claude Code session DAGs
 */
export class ClaudeCodeSessionDAG {
  // Map of node ID to node for fast lookups
  private nodes: Map<string, SessionNode> = new Map();
  
  // Map of session ID to root node ID for tracking sessions
  private sessions: Map<string, string> = new Map();
  
  /**
   * Get all sessions we are tracking
   * @returns Array of session IDs
   */
  getSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
  
  /**
   * Create a new root node for a new session
   * @param sessionId - The session ID
   * @param eventData - Optional initial event data for the session
   * @returns The created root node
   */
  addSession(sessionId: string, eventData?: any): SessionNode {
    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      console.warn(`Session ${sessionId} already exists`);
      return this.getNode(this.sessions.get(sessionId)!)!;
    }
    
    const rootNode: SessionNode = {
      id: uuidv4(),
      timeReceived: new Date(),
      eventType: ClaudeCodeEventType.SessionStart,
      rawBody: eventData || {},
      sessionId: sessionId,
      childIds: []
    };
    
    this.nodes.set(rootNode.id, rootNode);
    this.sessions.set(sessionId, rootNode.id);
    
    return rootNode;
  }
  
  /**
   * Get a node by its ID
   * @param id - The node ID
   * @returns The node if found, undefined otherwise
   */
  getNode(id: string): SessionNode | undefined {
    return this.nodes.get(id);
  }
  
  /**
   * Add a child relationship between two nodes
   * @param parentNode - The parent node (can be node object or ID)
   * @param childNode - The child node to add
   * @throws Error if parent node not found or child already has a parent
   */
  addChild(parentNode: SessionNode | string, childNode: SessionNode): void {
    // Get parent node if ID was passed
    const parent = typeof parentNode === 'string' 
      ? this.getNode(parentNode) 
      : parentNode;
      
    if (!parent) {
      throw new Error(`Parent node ${typeof parentNode === 'string' ? parentNode : parentNode.id} not found`);
    }
    
    // Check if child already has a parent
    if (childNode.parentId) {
      throw new Error(`Child node ${childNode.id} already has parent ${childNode.parentId}`);
    }
    
    // Set up the relationship
    childNode.parentId = parent.id;
    parent.childIds.push(childNode.id);
    
    // Add child to nodes map
    this.nodes.set(childNode.id, childNode);
  }
  
  /**
   * Create and add a new event node to a session
   * @param sessionId - The session to add the event to
   * @param eventType - The type of event
   * @param eventData - The raw event data
   * @param parentId - Optional parent node ID (if not provided, adds to root)
   * @returns The created node
   */
  addEvent(sessionId: string, eventType: ClaudeCodeEventType, eventData: any, parentId?: string): SessionNode {
    // Find the session root
    const rootId = this.sessions.get(sessionId);
    if (!rootId) {
      throw new Error(`Session ${sessionId} not found. Create session first with addSession()`);
    }
    
    // Create new node
    const newNode: SessionNode = {
      id: uuidv4(),
      timeReceived: new Date(),
      eventType: eventType,
      rawBody: eventData,
      sessionId: sessionId,
      childIds: []
    };
    
    // Determine parent - use provided parentId or session root
    const actualParentId = parentId || rootId;
    this.addChild(actualParentId, newNode);
    
    return newNode;
  }
  
  /**
   * Print a textual representation of a node
   * @param nodeOrId - Node object or node ID
   * @returns String representation of the node
   */
  printNode(nodeOrId: SessionNode | string): string {
    const node = typeof nodeOrId === 'string' 
      ? this.getNode(nodeOrId) 
      : nodeOrId;
      
    if (!node) {
      return `Node ${typeof nodeOrId === 'string' ? nodeOrId : 'unknown'} not found`;
    }
    
    const lines: string[] = [
      `Node ID: ${node.id}`,
      `Session ID: ${node.sessionId}`,
      `Event Type: ${node.eventType}`,
      `Time Received: ${node.timeReceived.toISOString()}`,
      `Parent ID: ${node.parentId || 'None (root node)'}`,
      `Child IDs: ${node.childIds.length > 0 ? node.childIds.join(', ') : 'None (leaf node)'}`,
      `Raw Body: ${JSON.stringify(node.rawBody, null, 2)}`
    ];
    
    // Add any additional properties
    const standardKeys = ['id', 'timeReceived', 'eventType', 'rawBody', 'sessionId', 'parentId', 'childIds'];
    const additionalKeys = Object.keys(node).filter(key => !standardKeys.includes(key));
    
    if (additionalKeys.length > 0) {
      lines.push('Additional Properties:');
      additionalKeys.forEach(key => {
        lines.push(`  ${key}: ${JSON.stringify(node[key], null, 2)}`);
      });
    }
    
    return lines.join('\n');
  }
  
  /**
   * Get the root node for a given session
   * @param sessionId - The session ID
   * @returns The root node if found
   */
  getSessionRoot(sessionId: string): SessionNode | undefined {
    const rootId = this.sessions.get(sessionId);
    return rootId ? this.getNode(rootId) : undefined;
  }
  
  /**
   * Get all nodes for a given session
   * @param sessionId - The session ID
   * @returns Array of all nodes in the session
   */
  getSessionNodes(sessionId: string): SessionNode[] {
    const nodes: SessionNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.sessionId === sessionId) {
        nodes.push(node);
      }
    }
    return nodes;
  }
  
  /**
   * Parse an event type string to ClaudeCodeEventType enum
   * @param eventTypeStr - The event type string
   * @returns The corresponding enum value, or Unknown if not recognized
   */
  static parseEventType(eventTypeStr: string): ClaudeCodeEventType {
    return ClaudeCodeEventType[eventTypeStr as keyof typeof ClaudeCodeEventType] || ClaudeCodeEventType.Unknown;
  }
}