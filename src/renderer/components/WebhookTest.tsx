import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Zap } from 'lucide-react';

interface WebhookTestProps {
  webhookPort: string;
  singleEndpoint?: boolean;
}

export function WebhookTest({ webhookPort, singleEndpoint = true }: WebhookTestProps) {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const runWebhookTest = async () => {
    setTestStatus('testing');
    setErrorMessage('');

    try {
      // First, check if the webhook server is running
      const healthResponse = await fetch(`http://localhost:${webhookPort}/health`);
      if (!healthResponse.ok) {
        throw new Error(`Webhook server not responding on port ${webhookPort}`);
      }

      // Send a test subagent event
      const testEvent = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Task',
        session_id: 'test-session-' + Date.now(),
        tool_input: {
          description: 'Test Webhook Connection',
          prompt: 'This is a test event to verify webhook connectivity'
        },
        timestamp: new Date().toISOString()
      };

      const endpoint = singleEndpoint ? 'webhook' : 'tool-event';
      const response = await fetch(`http://localhost:${webhookPort}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent)
      });

      if (!response.ok) {
        throw new Error(`Webhook test failed: ${response.status} ${response.statusText}`);
      }

      // Send a completion event after a short delay
      setTimeout(async () => {
        const completionEvent = {
          hook_event_name: 'PostToolUse',
          tool_name: 'Task',
          session_id: testEvent.session_id,
          tool_input: {
            description: 'Test Webhook Connection'
          },
          tool_output: {
            content: [{
              type: 'text',
              text: 'Test completed successfully!'
            }],
            totalDurationMs: 1000,
            totalTokens: 10,
            input_tokens: 5,
            output_tokens: 5
          },
          timestamp: new Date().toISOString()
        };

        await fetch(`http://localhost:${webhookPort}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(completionEvent)
        });
      }, 1000);

      setTestStatus('success');
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setTestStatus('idle');
      }, 3000);
    } catch (error) {
      setTestStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      
      // Reset status after 5 seconds
      setTimeout(() => {
        setTestStatus('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-muted/50">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Webhook Connectivity Test
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Test that the MCP Editor webhook server is running and can receive events.
        </p>
        
        <button
          onClick={runWebhookTest}
          disabled={testStatus === 'testing'}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     flex items-center gap-2"
        >
          {testStatus === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>

        {testStatus === 'success' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Test Successful!</p>
              <p className="text-sm text-green-700 mt-1">
                Webhook server is running on port {webhookPort} and receiving events correctly.
                Check the Subagent Monitor tab - you should see a "Test Webhook Connection" entry.
              </p>
            </div>
          </div>
        )}

        {testStatus === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Test Failed</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              <p className="text-sm text-red-700 mt-2">
                Make sure:
              </p>
              <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                <li>The MCP Editor app is running</li>
                <li>The webhook server is listening on port {webhookPort}</li>
                <li>No firewall is blocking local connections</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        <p className="font-medium mb-2">How the test works:</p>
        <ol className="space-y-1 list-decimal list-inside">
          <li>Checks if the webhook server is responding</li>
          <li>Sends a test PreToolUse event (subagent start)</li>
          <li>Sends a test PostToolUse event (subagent completion)</li>
          <li>Verifies the events were processed correctly</li>
        </ol>
      </div>
    </div>
  );
}