import React, { useState, useEffect } from 'react';
import { ClaudeUsageData } from '../../shared/types';
import { RefreshCw, AlertCircle, DollarSign, Activity, TrendingUp, Calendar, Code } from 'lucide-react';

export function ClaudeUsage() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [usageData, setUsageData] = useState<ClaudeUsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rawOutput, setRawOutput] = useState<string>('');

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    setChecking(true);
    setError(null);
    
    try {
      const result = await window.configAPI.checkCcusageAvailable();
      if (result.success && result.available) {
        setAvailable(true);
        // Automatically fetch usage data if available
        await fetchUsageData();
      } else {
        setAvailable(false);
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to check ccusage availability');
      setLoading(false);
    } finally {
      setChecking(false);
    }
  };

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch both parsed and raw data
      const [parsedResult, rawResult] = await Promise.all([
        window.configAPI.getUsageData(),
        window.configAPI.getUsageData({ raw: true })
      ]);

      if (parsedResult.success) {
        setUsageData(parsedResult.data);
      } else {
        setError(parsedResult.error || 'Failed to fetch usage data');
      }

      if (rawResult.success && rawResult.rawOutput) {
        setRawOutput(rawResult.rawOutput);
      }
    } catch (err) {
      setError('Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking ccusage availability...</p>
        </div>
      </div>
    );
  }

  if (!available) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 mb-2">ccusage Not Found</h3>
              <p className="text-sm text-amber-700 mb-4">
                The ccusage command-line tool is required to view your Claude usage statistics.
              </p>
              
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <h4 className="font-medium text-gray-800 mb-2">Installation Instructions</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="font-mono bg-amber-100 text-amber-800 px-1 rounded text-xs">1</span>
                    <div>
                      <p>Install ccusage globally using npm:</p>
                      <pre className="bg-gray-100 px-2 py-1 rounded mt-1 font-mono text-xs">npm install -g ccusage</pre>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-amber-100 text-amber-800 px-1 rounded text-xs">2</span>
                    <div>
                      <p>Or use npx to run without installing:</p>
                      <pre className="bg-gray-100 px-2 py-1 rounded mt-1 font-mono text-xs">npx ccusage@latest</pre>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono bg-amber-100 text-amber-800 px-1 rounded text-xs">3</span>
                    <p>Configure your Claude API credentials as required by ccusage</p>
                  </li>
                </ol>
              </div>
              
              <button
                onClick={checkAvailability}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Check Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 mb-2">Error Loading Usage Data</h3>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={fetchUsageData}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!usageData) {
    return null;
  }

  // Check if we have any actual data
  const hasData = usageData.totalCost > 0 || 
                  usageData.tokenUsage.total > 0 || 
                  (usageData.dailyUsage && usageData.dailyUsage.length > 0);

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Claude Usage Statistics</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            title="Toggle raw output"
          >
            <Code className="w-4 h-4" />
            {showRaw ? 'Hide' : 'Show'} Raw
          </button>
          <button
            onClick={fetchUsageData}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Total Cost Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Total Cost</h3>
            </div>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(usageData.totalCost, usageData.currency)}
            </p>
            {usageData.period.start && usageData.period.end && (
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(usageData.period.start).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })} - {new Date(usageData.period.end).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Token Usage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium">Input Tokens</h4>
          </div>
          <p className="text-2xl font-semibold">{formatNumber(usageData.tokenUsage.input)}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-600" />
            <h4 className="font-medium">Output Tokens</h4>
          </div>
          <p className="text-2xl font-semibold">{formatNumber(usageData.tokenUsage.output)}</p>
        </div>
        
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <h4 className="font-medium">Total Tokens</h4>
          </div>
          <p className="text-2xl font-semibold">{formatNumber(usageData.tokenUsage.total)}</p>
        </div>
      </div>

      {/* Model Breakdown */}
      {usageData.modelBreakdown && Object.keys(usageData.modelBreakdown).length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Usage by Model</h3>
          <div className="space-y-3">
            {Object.entries(usageData.modelBreakdown).map(([model, data]) => (
              <div key={model} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{model}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(data.requests)} requests
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(data.cost, usageData.currency)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(data.inputTokens + data.outputTokens)} tokens
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Usage Trend */}
      {usageData.dailyUsage && usageData.dailyUsage.length > 0 && (
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Recent Daily Usage</h3>
          </div>
          <div className="space-y-2">
            {usageData.dailyUsage.slice(-7).map((day) => {
              // Format date nicely
              const date = new Date(day.date);
              const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              });
              return (
                <div key={day.date} className="flex items-center justify-between py-1">
                  <span className="text-sm">{formattedDate}</span>
                  <span className="font-medium">{formatCurrency(day.cost, usageData.currency)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No data warning */}
      {!hasData && !showRaw && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">No Usage Data Found</h4>
              <p className="text-sm text-amber-700 mt-1">
                The ccusage command returned data, but we couldn't parse it properly. 
                Click "Show Raw" to see the actual output and help us debug the issue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Raw Output Debug View */}
      {showRaw && rawOutput && (
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Raw ccusage Output (JSON)</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm font-mono">
            {rawOutput}
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            This is the raw JSON output from running: <code className="bg-gray-200 px-1 rounded">ccusage -j</code>
          </p>
        </div>
      )}
    </div>
  );
}