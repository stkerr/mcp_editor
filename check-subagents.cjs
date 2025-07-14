#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the data file paths
const prodPath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'MCP Editor',
  'subagents.json'
);

const devPath = path.join(__dirname, 'dev-data', 'subagents.json');

console.log('Checking development data at:', devPath);
console.log('Checking production data at:', prodPath);

// Check dev path first
let dataPath = devPath;
if (!fs.existsSync(devPath) && fs.existsSync(prodPath)) {
  dataPath = prodPath;
}

try {
  if (fs.existsSync(dataPath)) {
    const data = fs.readFileSync(dataPath, 'utf8');
    const subagents = JSON.parse(data);
    
    console.log(`\nFound ${subagents.length} subagent(s):\n`);
    
    subagents.forEach((subagent, index) => {
      console.log(`[${index + 1}] ${subagent.id}`);
      console.log(`    Session: ${subagent.sessionId}`);
      console.log(`    Status: ${subagent.status}`);
      console.log(`    Start: ${subagent.startTime}`);
      console.log(`    Tools: ${subagent.toolsUsed.join(', ')}`);
      console.log('');
    });
  } else {
    console.log('\nNo subagent data file found yet.');
    console.log('This will be created when the first webhook is received.');
    
    // Check if parent directory exists
    const parentDir = path.dirname(dataPath);
    if (!fs.existsSync(parentDir)) {
      console.log(`\nDirectory does not exist: ${parentDir}`);
      console.log('It will be created automatically when data is saved.');
    }
  }
} catch (error) {
  console.error('Error reading subagent data:', error.message);
}

// Also check for webhook relay script
const relayScript = path.join(os.homedir(), 'Code', 'Personal', 'mcp_editor', 'webhook-relay.sh');
if (fs.existsSync(relayScript)) {
  console.log('\n✅ Webhook relay script found at:', relayScript);
} else {
  console.log('\n❌ Webhook relay script not found at:', relayScript);
}