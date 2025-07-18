const http = require('http');

// Helper function to send events
const sendEvent = (path, event, label) => {
  const postData = JSON.stringify(event);
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`${label} - STATUS: ${res.statusCode}`);
  });

  req.on('error', (e) => {
    console.error(`${label} - ERROR: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

console.log('Test scenario: Verify events appear after clearing');
console.log('1. Send initial UserPromptSubmit');

// Send initial prompt
sendEvent('/prompt-event', {
  hook_event_name: 'UserPromptSubmit',
  session_id: 'test-clear-123',
  prompt: 'Initial prompt before clearing',
  timestamp: new Date().toISOString()
}, 'Initial Prompt');

// Send a task event
setTimeout(() => {
  console.log('2. Send Task event');
  sendEvent('/tool-event', {
    hook_event_name: 'PreToolUse',
    session_id: 'test-clear-123',
    tool_name: 'Task',
    tool_input: {
      description: 'Test task before clearing',
      prompt: 'Do something'
    },
    timestamp: new Date().toISOString()
  }, 'Task Event');
}, 500);

// Instructions for manual test
setTimeout(() => {
  console.log('\n3. NOW CLICK "Clear All" IN THE UI');
  console.log('4. Wait for the clear to complete...\n');
}, 1500);

// Send new events after presumed clear
setTimeout(() => {
  console.log('5. Sending new UserPromptSubmit after clear');
  sendEvent('/prompt-event', {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'test-clear-456',
    prompt: 'New prompt after clearing - should appear immediately',
    timestamp: new Date().toISOString()
  }, 'Post-Clear Prompt');
}, 5000);

// Send another non-task event
setTimeout(() => {
  console.log('6. Sending Stop event (not a Task)');
  sendEvent('/stop-event', {
    hook_event_name: 'Stop',
    session_id: 'test-clear-456',
    timestamp: new Date().toISOString()
  }, 'Stop Event');
  
  console.log('\n✅ The new prompt should appear immediately in the UI');
  console.log('✅ You should NOT need to wait for a Task event');
}, 6000);