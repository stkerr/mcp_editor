const http = require('http');

// Test that clicking UserPromptSubmit shows the full prompt
console.log('Testing UserPromptSubmit click to show prompt...\n');

const testPrompts = [
  {
    prompt: 'Create a function to calculate the factorial of a number using recursion',
    sessionId: 'prompt-test-1'
  },
  {
    prompt: 'Write a React component that displays a todo list with add/remove functionality. Make it use TypeScript and include proper styling.',
    sessionId: 'prompt-test-2'
  },
  {
    prompt: `Multi-line prompt test:
- First, analyze the existing codebase
- Then create a new feature
- Finally, write tests for it`,
    sessionId: 'prompt-test-3'
  }
];

const sendPromptEvent = (promptData) => {
  const event = {
    hook_event_name: 'UserPromptSubmit',
    session_id: promptData.sessionId,
    prompt: promptData.prompt,
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
    console.log(`✅ Sent prompt for session ${promptData.sessionId}`);
  });

  req.on('error', (e) => {
    console.error(`❌ Error:`, e.message);
  });

  req.write(postData);
  req.end();
};

// Send all test prompts
testPrompts.forEach((promptData, index) => {
  setTimeout(() => {
    console.log(`\n${index + 1}. Sending prompt: "${promptData.prompt.substring(0, 50)}..."`);
    sendPromptEvent(promptData);
  }, index * 1000);
});

setTimeout(() => {
  console.log('\n📋 INSTRUCTIONS:');
  console.log('1. Go to the Subagent Monitor in the UI');
  console.log('2. Expand any of the test prompts');
  console.log('3. Click on the "⚡ Prompt started" line item');
  console.log('4. The details modal should show:');
  console.log('   - Title: "User Prompt" (not "Tool Input")');
  console.log('   - Content: The full prompt text');
  console.log('   - For multi-line prompts, formatting should be preserved');
}, testPrompts.length * 1000 + 500);