#!/usr/bin/env node

import http from 'http';

// Test webhook events
const testEvents = {
  // UserPromptSubmit event
  userPromptSubmit: {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'test-session-001',
    timestamp: new Date().toISOString(),
    tool_input: {
      prompt: 'Test user prompt: Create a hello world function',
      user_message: 'Test user prompt: Create a hello world function'
    }
  },
  
  // PreToolUse event for Task (subagent start)
  preToolUse: {
    hook_event_name: 'PreToolUse',
    tool_name: 'Task',
    session_id: 'test-session-001',
    timestamp: new Date().toISOString(),
    tool_input: {
      description: 'Test subagent task',
      prompt: 'Wait for 2 seconds and return success',
      tool_name: 'Task'
    }
  },
  
  // PostToolUse event for Task (subagent complete)
  postToolUse: {
    hook_event_name: 'PostToolUse',
    tool_name: 'Task',
    session_id: 'test-session-001',
    timestamp: new Date().toISOString(),
    tool_input: {
      description: 'Test subagent task',
      prompt: 'Wait for 2 seconds and return success',
      tool_name: 'Task'
    },
    tool_response: {
      content: [
        {
          type: 'text',
          text: 'Successfully waited for 2 seconds'
        }
      ],
      totalDurationMs: 2150,
      totalTokens: 145,
      input_tokens: 89,
      output_tokens: 56,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      totalToolUseCount: 1
    }
  },
  
  // SubagentStop event
  subagentStop: {
    hook_event_name: 'SubagentStop',
    event_type: 'SubagentStop',
    session_id: 'test-session-001',
    timestamp: new Date().toISOString(),
    tool_input: {
      description: 'Subagent completed successfully'
    }
  }
};

// Function to send webhook
async function sendWebhook(endpoint, eventData) {
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
        console.log(`✓ ${endpoint} - Status: ${res.statusCode}`);
        if (body) {
          try {
            console.log('  Response:', JSON.parse(body));
          } catch (e) {
            console.log('  Response:', body);
          }
        }
        resolve(res.statusCode);
      });
    });
    
    req.on('error', (e) => {
      console.error(`✗ ${endpoint} - Error:`, e.message);
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

// Test health endpoint first
async function testHealth() {
  console.log('\n=== Testing Health Endpoint ===');
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✓ Webhook server is healthy');
            console.log('  Response:', JSON.parse(body));
            resolve(true);
          } else {
            console.log('✗ Webhook server returned status:', res.statusCode);
            resolve(false);
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('✗ Cannot connect to webhook server:', e.message);
        console.log('\nMake sure the MCP Editor app is running!');
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('MCP Editor Webhook Test Suite');
  console.log('=============================\n');
  
  // Check if server is running
  const isHealthy = await testHealth();
  if (!isHealthy) {
    console.log('\nPlease start the MCP Editor app and try again.');
    process.exit(1);
  }
  
  console.log('\n=== Testing Webhook Events ===\n');
  
  // Test UserPromptSubmit
  console.log('1. Testing UserPromptSubmit event:');
  try {
    await sendWebhook('/prompt-event', testEvents.userPromptSubmit);
  } catch (e) {
    console.error('   Failed:', e.message);
  }
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test PreToolUse (subagent start)
  console.log('\n2. Testing PreToolUse event (subagent start):');
  try {
    await sendWebhook('/tool-event', testEvents.preToolUse);
  } catch (e) {
    console.error('   Failed:', e.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test PostToolUse (subagent complete)
  console.log('\n3. Testing PostToolUse event (subagent complete):');
  try {
    await sendWebhook('/tool-event', testEvents.postToolUse);
  } catch (e) {
    console.error('   Failed:', e.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test SubagentStop
  console.log('\n4. Testing SubagentStop event:');
  try {
    await sendWebhook('/subagent-event', testEvents.subagentStop);
  } catch (e) {
    console.error('   Failed:', e.message);
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\nCheck the MCP Editor app to see if events were received!');
}

// Run the tests
runTests().catch(console.error);