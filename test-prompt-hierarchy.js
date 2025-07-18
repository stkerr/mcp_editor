#!/usr/bin/env node

import http from 'http';

// Test scenarios for prompt-based hierarchy
const scenarios = {
  // Scenario 1: Normal flow - prompt, tasks, stop
  normalFlow: async () => {
    console.log('\n=== Scenario 1: Normal Flow ===');
    const sessionId = 'test-normal-' + Date.now();
    
    // 1. UserPromptSubmit
    await sendEvent('/prompt-event', {
      hook_event_name: 'UserPromptSubmit',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_input: {
        prompt: 'Create a function to calculate fibonacci numbers'
      }
    });
    
    await delay(500);
    
    // 2. PreToolUse - Task
    await sendEvent('/tool-event', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Task',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_input: {
        description: 'Write fibonacci function',
        prompt: 'Create a function that calculates fibonacci numbers'
      }
    });
    
    await delay(1000);
    
    // 3. PostToolUse - Task
    await sendEvent('/tool-event', {
      hook_event_name: 'PostToolUse',
      tool_name: 'Task',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_input: {
        description: 'Write fibonacci function',
        prompt: 'Create a function that calculates fibonacci numbers'
      },
      tool_response: {
        content: [{ type: 'text', text: 'Created fibonacci function successfully' }],
        totalDurationMs: 1200,
        totalTokens: 250,
        input_tokens: 150,
        output_tokens: 100
      }
    });
    
    await delay(500);
    
    // 4. Stop event
    await sendEvent('/stop-event', {
      hook_event_name: 'Stop',
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
    
    console.log('✓ Normal flow completed');
  },
  
  // Scenario 2: Interrupted flow - new prompt before stop
  interruptedFlow: async () => {
    console.log('\n=== Scenario 2: Interrupted Flow ===');
    const sessionId = 'test-interrupt-' + Date.now();
    
    // 1. First UserPromptSubmit
    await sendEvent('/prompt-event', {
      hook_event_name: 'UserPromptSubmit',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_input: {
        prompt: 'Explain how async/await works'
      }
    });
    
    await delay(500);
    
    // 2. Start a task
    await sendEvent('/tool-event', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Task',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_input: {
        description: 'Research async/await',
        prompt: 'Research and explain async/await'
      }
    });
    
    await delay(500);
    
    // 3. User interrupts with new prompt
    await sendEvent('/prompt-event', {
      hook_event_name: 'UserPromptSubmit',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_input: {
        prompt: 'Actually, just write a simple hello world'
      }
    });
    
    await delay(500);
    
    // 4. New task for second prompt
    await sendEvent('/tool-event', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_input: {
        file_path: 'hello.js',
        content: 'console.log("Hello, World!");'
      }
    });
    
    await delay(500);
    
    // 5. Complete the write
    await sendEvent('/tool-event', {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      session_id: sessionId,
      timestamp: new Date().toISOString(),
      tool_response: {
        content: [{ type: 'text', text: 'File written successfully' }]
      }
    });
    
    await delay(500);
    
    // 6. Stop event for second prompt
    await sendEvent('/stop-event', {
      hook_event_name: 'Stop',
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });
    
    console.log('✓ Interrupted flow completed');
  },
  
  // Scenario 3: Multiple concurrent sessions
  concurrentSessions: async () => {
    console.log('\n=== Scenario 3: Concurrent Sessions ===');
    const session1 = 'test-concurrent-1-' + Date.now();
    const session2 = 'test-concurrent-2-' + Date.now();
    
    // Session 1: Start
    await sendEvent('/prompt-event', {
      hook_event_name: 'UserPromptSubmit',
      session_id: session1,
      timestamp: new Date().toISOString(),
      tool_input: {
        prompt: 'Session 1: Create a React component'
      }
    });
    
    await delay(200);
    
    // Session 2: Start
    await sendEvent('/prompt-event', {
      hook_event_name: 'UserPromptSubmit',
      session_id: session2,
      timestamp: new Date().toISOString(),
      tool_input: {
        prompt: 'Session 2: Debug Python script'
      }
    });
    
    await delay(200);
    
    // Session 1: Task
    await sendEvent('/tool-event', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Task',
      session_id: session1,
      timestamp: new Date().toISOString(),
      tool_input: {
        description: 'Create Button component',
        prompt: 'Create a reusable Button component'
      }
    });
    
    await delay(200);
    
    // Session 2: Task
    await sendEvent('/tool-event', {
      hook_event_name: 'PreToolUse',
      tool_name: 'Task',
      session_id: session2,
      timestamp: new Date().toISOString(),
      tool_input: {
        description: 'Debug Python script',
        prompt: 'Find and fix the bug in the script'
      }
    });
    
    await delay(500);
    
    // Complete both sessions
    await sendEvent('/stop-event', {
      hook_event_name: 'Stop',
      session_id: session1,
      timestamp: new Date().toISOString()
    });
    
    await sendEvent('/stop-event', {
      hook_event_name: 'Stop',
      session_id: session2,
      timestamp: new Date().toISOString()
    });
    
    console.log('✓ Concurrent sessions completed');
  }
};

// Helper functions
async function sendEvent(endpoint, eventData) {
  const data = JSON.stringify(eventData);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`  ✓ Sent ${eventData.hook_event_name || 'event'} to ${endpoint}`);
          resolve(res.statusCode);
        } else {
          console.error(`  ✗ Failed: ${res.statusCode}`);
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`  ✗ Error: ${e.message}`);
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check server health first
async function checkHealth() {
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => resolve(false));
      req.end();
    });
  } catch {
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('MCP Editor Prompt Hierarchy Test Suite');
  console.log('=====================================');
  
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.error('\n✗ MCP Editor webhook server is not running!');
    console.log('Please start the MCP Editor app first.');
    process.exit(1);
  }
  
  console.log('\n✓ Webhook server is healthy\n');
  
  // Run scenarios
  try {
    await scenarios.normalFlow();
    await delay(1000);
    
    await scenarios.interruptedFlow();
    await delay(1000);
    
    await scenarios.concurrentSessions();
    
    console.log('\n=== All Tests Completed ===');
    console.log('\nCheck the MCP Editor app to see the prompt-based hierarchy!');
    console.log('You should see:');
    console.log('- UserPromptSubmit events as top-level parents');
    console.log('- All other events nested under their prompts');
    console.log('- Interrupted prompts marked appropriately');
    console.log('- Multiple sessions handled correctly');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);