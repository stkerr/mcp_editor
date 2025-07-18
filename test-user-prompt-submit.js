const http = require('http');

// Test UserPromptSubmit event
const testUserPromptSubmit = () => {
  const event = {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'test-session-123',
    prompt: 'Create a function to calculate fibonacci numbers',
    timestamp: new Date().toISOString()
  };

  const postData = JSON.stringify(event);

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/prompt-event',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

// Test Task tool use event
const testTaskEvent = () => {
  const event = {
    hook_event_name: 'PreToolUse',
    session_id: 'test-session-123',
    tool_name: 'Task',
    tool_input: {
      description: 'Calculate fibonacci sequence',
      prompt: 'Write a function that calculates the nth fibonacci number'
    },
    timestamp: new Date().toISOString()
  };

  const postData = JSON.stringify(event);

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/tool-event',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Task EVENT STATUS: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Task Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with task request: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

// Test Stop event
const testStopEvent = () => {
  const event = {
    hook_event_name: 'Stop',
    session_id: 'test-session-123',
    timestamp: new Date().toISOString()
  };

  const postData = JSON.stringify(event);

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/stop-event',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Stop EVENT STATUS: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Stop Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with stop request: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

// Test sequence
console.log('Testing UserPromptSubmit event...');
testUserPromptSubmit();

// Wait a bit then send task event
setTimeout(() => {
  console.log('\nTesting Task event...');
  testTaskEvent();
}, 1000);

// Wait more then send stop event
setTimeout(() => {
  console.log('\nTesting Stop event...');
  testStopEvent();
}, 2000);

// Test interruption scenario
setTimeout(() => {
  console.log('\n\nTesting interruption scenario...');
  console.log('Sending new UserPromptSubmit for same session...');
  
  const event = {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'test-session-123',
    prompt: 'Actually, create a function to calculate prime numbers instead',
    timestamp: new Date().toISOString()
  };

  const postData = JSON.stringify(event);

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/prompt-event',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Interruption STATUS: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Interruption Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with interruption request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}, 3000);