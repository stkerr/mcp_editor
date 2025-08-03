import { ClaudeCodeSessionDAG, ClaudeCodeEventType } from './claudeCodeSessionDAG';

/**
 * Example usage of the ClaudeCodeSessionDAG data structure
 * This demonstrates how to create sessions, add events, and traverse the DAG
 */

// Create a new DAG instance
const dag = new ClaudeCodeSessionDAG();

// Example 1: Create a new session
console.log('=== Example 1: Creating a Session ===');
const sessionId = 'session-123';
const rootNode = dag.addSession(sessionId, { 
  metadata: 'Session started by user' 
});
console.log('Created session:', sessionId);
console.log(dag.printNode(rootNode));

// Example 2: Add a UserPromptSubmit event
console.log('\n=== Example 2: Adding UserPromptSubmit Event ===');
const promptEvent = dag.addEvent(
  sessionId, 
  ClaudeCodeEventType.UserPromptSubmit,
  {
    prompt: 'Help me write a function to calculate fibonacci numbers',
    timestamp: new Date().toISOString()
  }
);
console.log(dag.printNode(promptEvent));

// Example 3: Add PreToolUse event as child of the prompt
console.log('\n=== Example 3: Adding PreToolUse Event ===');
const preToolEvent = dag.addEvent(
  sessionId,
  ClaudeCodeEventType.PreToolUse,
  {
    tool: 'code_editor',
    action: 'create_file',
    filename: 'fibonacci.ts'
  },
  promptEvent.id // Parent is the prompt event
);
console.log(dag.printNode(preToolEvent));

// Example 4: Add PostToolUse event
console.log('\n=== Example 4: Adding PostToolUse Event ===');
const postToolEvent = dag.addEvent(
  sessionId,
  ClaudeCodeEventType.PostToolUse,
  {
    tool: 'code_editor',
    action: 'create_file',
    filename: 'fibonacci.ts',
    success: true,
    result: 'File created successfully'
  },
  preToolEvent.id // Parent is the PreToolUse event
);
console.log(dag.printNode(postToolEvent));

// Example 5: Add a SubagentStop event
console.log('\n=== Example 5: Adding SubagentStop Event ===');
const subagentStopEvent = dag.addEvent(
  sessionId,
  ClaudeCodeEventType.SubagentStop,
  {
    subagentId: 'subagent-456',
    description: 'Code writing task completed',
    tokensUsed: 1500,
    duration: 3.2
  },
  promptEvent.id // Parent is the original prompt
);
console.log(dag.printNode(subagentStopEvent));

// Example 6: Demonstrate flexible properties
console.log('\n=== Example 6: Adding Custom Properties ===');
const customEvent = dag.addEvent(
  sessionId,
  ClaudeCodeEventType.Notification,
  {
    message: 'Permission required for file system access'
  },
  promptEvent.id
);
// Add custom properties after creation
customEvent.customField1 = 'This is a custom field';
customEvent.customField2 = { nested: 'data', count: 42 };
console.log(dag.printNode(customEvent));

// Example 7: Query the DAG
console.log('\n=== Example 7: Querying the DAG ===');
console.log('All sessions:', dag.getSessions());
console.log('Session nodes count:', dag.getSessionNodes(sessionId).length);
console.log('Root node children:', rootNode.childIds.length);

// Example 8: Handle unknown event type
console.log('\n=== Example 8: Handling Unknown Event Type ===');
const unknownEventType = ClaudeCodeSessionDAG.parseEventType('SomeNewEventType');
console.log('Parsed unknown event type:', unknownEventType); // Should be 'Unknown'

const unknownEvent = dag.addEvent(
  sessionId,
  unknownEventType,
  {
    data: 'This is an unknown event type that we handle gracefully'
  }
);
console.log(dag.printNode(unknownEvent));

// Example 9: Create a second session to show multiple DAGs
console.log('\n=== Example 9: Multiple Sessions ===');
const session2Id = 'session-456';
const root2 = dag.addSession(session2Id, {
  metadata: 'Another session'
});

const prompt2 = dag.addEvent(
  session2Id,
  ClaudeCodeEventType.UserPromptSubmit,
  {
    prompt: 'Explain how async/await works'
  }
);

console.log('Total sessions:', dag.getSessions().length);
console.log('Session 1 nodes:', dag.getSessionNodes(sessionId).length);
console.log('Session 2 nodes:', dag.getSessionNodes(session2Id).length);

// Example 10: Error handling
console.log('\n=== Example 10: Error Handling ===');
try {
  // Try to add event to non-existent session
  dag.addEvent('non-existent-session', ClaudeCodeEventType.Stop, {});
} catch (error) {
  console.log('Expected error:', error.message);
}

try {
  // Try to add a node as child twice
  const tempNode = {
    id: 'temp-123',
    timeReceived: new Date(),
    eventType: ClaudeCodeEventType.Stop,
    rawBody: {},
    sessionId: sessionId,
    parentId: promptEvent.id, // Already has a parent
    childIds: []
  };
  dag.addChild(rootNode, tempNode);
} catch (error) {
  console.log('Expected error:', error.message);
}