#!/usr/bin/env node

const http = require('http');

// Test data simulating Claude Code hook event
const testSubagentEvent = {
  session_id: 'test-session-123',
  event_type: 'SubagentStop',
  tool_input: {
    description: 'Test subagent task',
    tool_name: 'Task'
  },
  tool_output: {
    tools_used: ['Bash', 'Read', 'Write']
  },
  transcript_path: '/tmp/test-transcript.md'
};

const testToolEvent = {
  session_id: 'test-session-456',
  event_type: 'PreToolUse',
  tool_input: {
    tool_name: 'Bash',
    description: 'Running ls command'
  }
};

function sendWebhookEvent(eventData, endpoint = 'subagent-event') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(eventData);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✓ ${endpoint} response (${res.statusCode}):`, data);
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.error(`✗ Error sending to ${endpoint}:`, err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✓ Health check response (${res.statusCode}):`, data);
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.error('✗ Error checking health:', err.message);
      reject(err);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing MCP Editor Webhook Server');
  console.log('=====================================\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    await testHealthEndpoint();
    console.log('');

    // Test subagent event
    console.log('2. Testing subagent event...');
    await sendWebhookEvent(testSubagentEvent, 'subagent-event');
    console.log('');

    // Test tool event
    console.log('3. Testing tool event...');
    await sendWebhookEvent(testToolEvent, 'tool-event');
    console.log('');

    console.log('✅ All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the MCP Editor app');
    console.log('2. Navigate to the Subagent Monitor tab');
    console.log('3. Configure hooks in Claude Code using the generated configuration');
    console.log('4. Start using subagents in Claude Code');
    console.log('5. Observe real-time updates in the MCP Editor');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the MCP Editor app is running before running these tests.');
    process.exit(1);
  }
}

runTests();