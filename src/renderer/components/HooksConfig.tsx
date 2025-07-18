import React, { useState, useEffect } from 'react';
import { ClaudeCodeHooks } from '../../shared/types';
import { Copy, Check, Download, Settings, AlertCircle, Save } from 'lucide-react';
import { WebhookTest } from './WebhookTest';

interface HooksConfigProps {
  onConfigGenerated?: (config: ClaudeCodeHooks) => void;
}

export function HooksConfig({ onConfigGenerated }: HooksConfigProps) {
  const [copied, setCopied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [webhookPort, setWebhookPort] = useState('3001');
  const [appPath, setAppPath] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [hooksConfigured, setHooksConfigured] = useState<boolean | null>(null);
  // Default to production mode unless we detect development environment
  const [isDevelopment, setIsDevelopment] = useState(
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  // Get the platform-specific app path
  const getDefaultAppPath = () => {
    if (isDevelopment) {
      // For development, use the webhook relay script
      // Provide a generic example path
      const platform = navigator.platform.toLowerCase();
      if (platform.includes('win')) {
        return 'path\\to\\mcp_editor\\webhook-relay.sh';
      } else {
        return './webhook-relay.sh';
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
    const webhookPort = 3001;
    const executablePath = appPath || getDefaultAppPath();
    
    // Determine the webhook relay script path
    let relayScriptPath: string;
    if (isDevelopment) {
      // In development, use the script from the project root
      // In development, use relative path or current working directory
      relayScriptPath = window.platformAPI?.cwd ? `${window.platformAPI.cwd}/resources/webhook-relay.sh` : './resources/webhook-relay.sh';
    } else {
      // In production, the script is bundled in the app's Resources folder
      // With extraResources, it's directly in the Resources folder
      const platform = window.platformAPI?.platform || navigator.platform.toLowerCase();
      if (platform === 'darwin' || platform.includes('mac')) {
        // macOS: /Applications/MCP Editor.app/Contents/Resources/webhook-relay.sh
        const pathParts = executablePath.split('/');
        const appIndex = pathParts.findIndex(part => part.endsWith('.app'));
        if (appIndex !== -1) {
          const appPath = pathParts.slice(0, appIndex + 1).join('/');
          relayScriptPath = `${appPath}/Contents/Resources/webhook-relay.sh`;
        } else {
          relayScriptPath = executablePath.replace(/\/MacOS\/[^\/]+$/, '/Resources/webhook-relay.sh');
        }
      } else if (platform === 'win32' || platform.includes('win')) {
        // Windows: resources folder is next to the exe
        relayScriptPath = executablePath.replace(/[^\\]+\.exe$/, 'resources\\webhook-relay.sh');
      } else {
        // Linux: resources folder is next to the executable
        relayScriptPath = executablePath.replace(/[^\/]+$/, 'resources/webhook-relay.sh');
      }
    }
    
    if (isDevelopment) {
      // For development, use the webhook relay script with the endpoint as argument
      return {
        UserPromptSubmit: [
          {
            matcher: ".*",
            hooks: [
              {
                type: "command",
                command: `"${relayScriptPath}" http://localhost:${webhookPort}/prompt-event`
              }
            ]
          }
        ],
        Stop: [
          {
            matcher: ".*",
            hooks: [
              {
                type: "command",
                command: `"${relayScriptPath}" http://localhost:${webhookPort}/stop-event`
              }
            ]
          }
        ],
        SubagentStop: [
          {
            matcher: ".*",
            hooks: [
              {
                type: "command",
                command: `"${relayScriptPath}" http://localhost:${webhookPort}/subagent-event`
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
                command: `"${relayScriptPath}" http://localhost:${webhookPort}/tool-event`
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
                command: `"${relayScriptPath}" http://localhost:${webhookPort}/tool-event`
              }
            ]
          }
        ]
      };
    }
    
    // For production builds
    return {
      UserPromptSubmit: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: `"${relayScriptPath}" http://localhost:${webhookPort}/prompt-event`
            }
          ]
        }
      ],
      Stop: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: `"${relayScriptPath}" http://localhost:${webhookPort}/stop-event`
            }
          ]
        }
      ],
      SubagentStop: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: `"${relayScriptPath}" http://localhost:${webhookPort}/subagent-event`
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
              command: `"${relayScriptPath}" http://localhost:${webhookPort}/tool-event`
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
              command: `"${relayScriptPath}" http://localhost:${webhookPort}/tool-event`
            }
          ]
        }
      ]
    };
  };

  const hooksConfig = generateHooksConfig();
  const isConfigEmpty = Object.keys(hooksConfig).length === 0;

  // Check if hooks are already configured when component mounts or hooks config changes
  useEffect(() => {
    const checkHooks = async () => {
      if (!window.configAPI?.checkHooksConfigured || isConfigEmpty) {
        return;
      }
      
      try {
        const result = await window.configAPI.checkHooksConfigured(hooksConfig);
        if (result.success) {
          setHooksConfigured(result.configured || false);
        }
      } catch (error) {
        console.error('Failed to check hooks configuration:', error);
      }
    };
    
    checkHooks();
  }, [webhookPort, appPath, isDevelopment]); // Re-check when config parameters change

  // Reset applied state when configuration changes
  useEffect(() => {
    setApplied(false);
  }, [webhookPort, appPath, isDevelopment]);

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

  const handleApplyToConfig = async () => {
    try {
      setIsApplying(true);
      setNotification(null);
      
      if (!window.configAPI?.applyHooksToConfig) {
        throw new Error('API not available');
      }
      
      const result = await window.configAPI.applyHooksToConfig(hooksConfig);
      
      if (result.success) {
        setNotification({
          type: 'success',
          message: `Hooks applied successfully! Backup saved at: ${result.backupPath}`
        });
        // Re-check if hooks are configured
        setHooksConfigured(true);
        // Set applied state for button feedback
        setApplied(true);
        // Clear success notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
        // Reset applied state after 3 seconds
        setTimeout(() => setApplied(false), 3000);
      } else {
        setNotification({
          type: 'error',
          message: result.error || 'Failed to apply hooks configuration'
        });
      }
      
      onConfigGenerated?.(hooksConfig);
    } catch (err) {
      console.error('Failed to apply hooks to config:', err);
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to apply hooks configuration'
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`border rounded-lg p-4 ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <p className={`text-sm ${
              notification.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {notification.message}
            </p>
          </div>
        </div>
      )}
      
      {hooksConfigured === true ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800">Hooks Configured</h4>
              <p className="text-sm text-green-700 mt-1">
                Claude Code hooks are already configured. The Subagent Monitor will receive events
                when you use subagents in Claude Code.
              </p>
            </div>
          </div>
        </div>
      ) : (
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
      )}

      <WebhookTest webhookPort={webhookPort} />

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
            <button
              onClick={handleApplyToConfig}
              disabled={isConfigEmpty || isApplying || applied}
              className={`flex items-center gap-1 px-3 py-1 text-sm border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                applied 
                  ? 'bg-green-100 border-green-300 text-green-700' 
                  : 'bg-background hover:bg-muted'
              }`}
            >
              {applied ? (
                <>
                  <Check className="w-3 h-3" />
                  Applied!
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  {isApplying ? 'Applying...' : 'Apply to Config'}
                </>
              )}
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
            <span>Click "Apply to Config" to automatically add hooks to your Claude Code configuration, or manually copy/download the configuration</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">2</span>
            <span>If applying manually, add the hooks to your Claude Code config file at <code className="bg-background px-1 rounded">~/.claude/settings.json</code></span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">3</span>
            <span>Restart Claude Code for the changes to take effect</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono bg-primary text-primary-foreground px-1 rounded text-xs">4</span>
            <span>Start using subagents in Claude Code - their activity will appear in the Subagent Monitor</span>
          </li>
        </ol>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-blue-800 mb-2">Troubleshooting Tips</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• Use the test button above to verify webhook connectivity</li>
          <li>• Ensure MCP Editor is running before using Claude Code subagents</li>
          <li>• Check that port {webhookPort} is not blocked by firewall</li>
          <li>• The app must be running to receive webhook events</li>
        </ul>
      </div>
    </div>
  );
}