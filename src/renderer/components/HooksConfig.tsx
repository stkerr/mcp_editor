import React, { useState } from 'react';
import { ClaudeCodeHooks } from '../../shared/types';
import { Copy, Check, Download, Settings, AlertCircle } from 'lucide-react';

interface HooksConfigProps {
  onConfigGenerated?: (config: ClaudeCodeHooks) => void;
}

export function HooksConfig({ onConfigGenerated }: HooksConfigProps) {
  const [copied, setCopied] = useState(false);
  const [webhookPort, setWebhookPort] = useState('3001');
  const [appPath, setAppPath] = useState('');
  const [isDevelopment, setIsDevelopment] = useState(true);

  // Get the platform-specific app path
  const getDefaultAppPath = () => {
    if (isDevelopment) {
      // For development, use the webhook relay script
      // In browser context, we can't access process.platform or env vars directly
      // Use a sensible default based on the user's system
      const platform = navigator.platform.toLowerCase();
      if (platform.includes('win')) {
        return 'C:\\Users\\YourUsername\\Code\\Personal\\mcp_editor\\webhook-relay.sh';
      } else {
        return '/Users/stkerr/Code/Personal/mcp_editor/webhook-relay.sh';
      }
    }
    
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) {
      return 'C:\\Program Files\\mcp-editor\\mcp-editor.exe';
    } else if (platform.includes('mac')) {
      return '/Applications/MCP Editor.app/Contents/MacOS/MCP Editor';
    } else {
      return '/usr/local/bin/mcp-editor';
    }
  };

  const generateHooksConfig = (): ClaudeCodeHooks => {
    const executablePath = appPath || getDefaultAppPath();
    
    if (isDevelopment) {
      // For development, use the webhook relay script with the endpoint as argument
      return {
        SubagentStop: [
          {
            matcher: ".*",
            hooks: [
              {
                type: "command",
                command: `"${executablePath}" subagent-event`
              }
            ]
          }
        ],
        PreToolUse: [
          {
            matcher: "Task",
            hooks: [
              {
                type: "command", 
                command: `"${executablePath}" tool-event`
              }
            ]
          }
        ],
        PostToolUse: [
          {
            matcher: "Task",
            hooks: [
              {
                type: "command", 
                command: `"${executablePath}" tool-event`
              }
            ]
          }
        ]
      };
    }
    
    // For production builds
    return {
      SubagentStop: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: `"${executablePath}" --webhook http://localhost:${webhookPort}/subagent-event`
            }
          ]
        }
      ],
      PreToolUse: [
        {
          matcher: "Task",
          hooks: [
            {
              type: "command", 
              command: `"${executablePath}" --webhook http://localhost:${webhookPort}/tool-event`
            }
          ]
        }
      ],
      PostToolUse: [
        {
          matcher: "Task",
          hooks: [
            {
              type: "command", 
              command: `"${executablePath}" --webhook http://localhost:${webhookPort}/tool-event`
            }
          ]
        }
      ]
    };
  };

  const hooksConfig = generateHooksConfig();

  const handleCopy = async () => {
    try {
      const configText = JSON.stringify({ hooks: hooksConfig }, null, 2);
      await navigator.clipboard.writeText(configText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onConfigGenerated?.(hooksConfig);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadConfig = () => {
    const configText = JSON.stringify({ hooks: hooksConfig }, null, 2);
    const blob = new Blob([configText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-code-hooks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onConfigGenerated?.(hooksConfig);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Setup Required</h4>
            <p className="text-sm text-amber-700 mt-1">
              To monitor subagents, you need to configure hooks in your Claude Code settings. 
              This will send subagent events to the MCP Editor app.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Development Mode
            </label>
            <button
              onClick={() => setIsDevelopment(!isDevelopment)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isDevelopment ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isDevelopment ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isDevelopment 
              ? 'Using webhook relay script for local development'
              : 'Using production app executable'
            }
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Webhook Port
          </label>
          <input
            type="number"
            value={webhookPort}
            onChange={(e) => setWebhookPort(e.target.value)}
            className="w-32 px-3 py-2 border border-border rounded-lg bg-background"
            placeholder="3001"
            min="1000"
            max="65535"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Port for receiving webhook events from Claude Code
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {isDevelopment ? 'Webhook Relay Script Path' : 'MCP Editor Executable Path'} (Optional)
          </label>
          <input
            type="text"
            value={appPath}
            onChange={(e) => setAppPath(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-sm"
            placeholder={getDefaultAppPath()}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {isDevelopment 
              ? 'Path to webhook-relay.sh script (default: ~/Code/Personal/mcp_editor/webhook-relay.sh)'
              : 'Leave empty to use default path for your platform'
            }
          </p>
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="font-medium">Generated Hooks Configuration</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-background border rounded hover:bg-muted transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={downloadConfig}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-background border rounded hover:bg-muted transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        </div>
        <pre className="p-4 text-sm font-mono bg-background overflow-x-auto">
          {JSON.stringify({ hooks: hooksConfig }, null, 2)}
        </pre>
      </div>

      <div className="bg-muted rounded-lg p-4">
        <h4 className="font-medium mb-3">Installation Instructions</h4>
        <ol className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">1</span>
            <span>Copy the configuration above or download it as a JSON file</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">2</span>
            <span>Open your Claude Code settings file (usually at <code className="bg-background px-1 rounded">~/.config/claude-code/settings.json</code>)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">3</span>
            <span>Add or merge the "hooks" configuration into your settings</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">4</span>
            <span>Restart Claude Code for the changes to take effect</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">5</span>
            <span>Start using subagents in Claude Code - their activity will appear in the Subagent Monitor</span>
          </li>
        </ol>
      </div>
    </div>
  );
}