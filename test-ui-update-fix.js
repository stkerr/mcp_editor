const http = require('http');

// Test that UI updates immediately without waiting for Task events
console.log('Testing UI immediate update fix...\n');

// Send UserPromptSubmit
const promptEvent = {
  hook_event_name: 'UserPromptSubmit',
  session_id: 'ui-test-' + Date.now(),
  prompt: 'Test prompt - UI should update immediately!',
  timestamp: new Date().toISOString()
};

const sendEvent = (path, data, label) => {
  const postData = JSON.stringify(data);
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
    console.log(`${label} - Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log(`${label} - Response:`, body);
    });
  });

  req.on('error', (e) => {
    console.error(`${label} - Error:`, e.message);
  });

  req.write(postData);
  req.end();
};

console.log('1. Sending UserPromptSubmit event...');
sendEvent('/prompt-event', promptEvent, 'UserPromptSubmit');

setTimeout(() => {
  console.log('\n✅ CHECK THE UI NOW - The prompt should appear with "⚡ Task started" event');
  console.log('✅ You should NOT need to wait for any Task events\n');
}, 1000);

// Send Stop event after 3 seconds
setTimeout(() => {
  console.log('2. Sending Stop event...');
  const stopEvent = {
    hook_event_name: 'Stop',
    session_id: promptEvent.session_id,
    timestamp: new Date().toISOString()
  };
  sendEvent('/stop-event', stopEvent, 'Stop');
  
  setTimeout(() => {
    console.log('\n✅ The prompt should now show as completed with "✅ Session completed" event');
  }, 500);
}, 3000);