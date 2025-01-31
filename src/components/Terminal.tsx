import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface TerminalProps {
  logs: Array<{
    timestamp: string;
    status: number;
    url: string;
  }>;
}

export const Terminal = ({ logs }: TerminalProps) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [processedCount, setProcessedCount] = useState(0);

  useEffect(() => {
    setProcessedCount(logs.length);
  }, [logs]);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-terminal-success";
    if (status >= 300 && status < 400) return "text-terminal-warning";
    return "text-terminal-error";
  };

  const getStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) return <CheckCircle className="w-4 h-4 text-terminal-success" />;
    if (status >= 300 && status < 400) return <AlertCircle className="w-4 h-4 text-terminal-warning" />;
    return <XCircle className="w-4 h-4 text-terminal-error" />;
  };

  const sortedLogs = [...logs].sort((a, b) => {
    return sortOrder === 'asc' ? a.status - b.status : b.status - a.status;
  });

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const totalFiles = logs.length;
  const successfulFiles = logs.filter(log => log.status >= 200 && log.status < 300).length;
  const warningFiles = logs.filter(log => log.status >= 300 && log.status < 400).length;
  const errorFiles = logs.filter(log => log.status >= 400).length;
  const processedFiles = successfulFiles + warningFiles + errorFiles;
  const processingProgress = totalFiles > 0 ? Math.round((processedFiles / totalFiles) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-terminal-text">Archive Results</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSort}
          className="gap-2 text-terminal-text hover:text-terminal-text/80"
        >
          <ArrowUpDown className="h-4 w-4" />
          Sort by Status {sortOrder === 'asc' ? '↑' : '↓'}
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-terminal-bg rounded-lg p-3 border border-terminal-text/10">
          <div className="text-sm text-terminal-text/70">Total Files</div>
          <div className="text-xl font-mono text-terminal-text">{totalFiles}</div>
        </div>
        <div className="bg-terminal-bg rounded-lg p-3 border border-terminal-text/10">
          <div className="text-sm text-terminal-text/70">Successful (2xx)</div>
          <div className="text-xl font-mono text-terminal-success">{successfulFiles}</div>
        </div>
        <div className="bg-terminal-bg rounded-lg p-3 border border-terminal-text/10">
          <div className="text-sm text-terminal-text/70">Redirects (3xx)</div>
          <div className="text-xl font-mono text-terminal-warning">{warningFiles}</div>
        </div>
        <div className="bg-terminal-bg rounded-lg p-3 border border-terminal-text/10">
          <div className="text-sm text-terminal-text/70">Errors (4xx/5xx)</div>
          <div className="text-xl font-mono text-terminal-error">{errorFiles}</div>
        </div>
      </div>
      
      <ScrollArea className="h-[400px] w-full rounded-md border bg-terminal-bg p-4 shadow-lg">
        <div className="font-mono text-sm text-terminal-text">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-8">
              <div className="flex items-center space-x-2">
                <span className="text-terminal-success">❯</span>
                <span>Terminal Ready</span>
                <span className="animate-blink">▊</span>
              </div>
              <div className="text-terminal-text/50 text-xs">
                Waiting for URL input to begin analysis...
              </div>
              <div className="text-terminal-text/50 text-xs mt-4">
                Real-time Status:
              </div>
              <div className="text-terminal-text/50 text-xs">
                • URLs Found: {totalFiles}
              </div>
              <div className="text-terminal-text/50 text-xs">
                • Processing Queue: {logs.length} URLs
              </div>
              <div className="text-terminal-text/50 text-xs">
                • Currently Processing: {processedCount} URLs
              </div>
              <div className="text-terminal-text/50 text-xs">
                • Completed: {processedFiles} ({processingProgress}%)
              </div>
              <div className="text-terminal-text/50 text-xs">
                • Success Rate: {totalFiles > 0 ? Math.round((successfulFiles / totalFiles) * 100) : 0}%
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-terminal-text/50 mb-4">
                <div className="mb-2">
                  Processing Status: {processedFiles === totalFiles ? 'Complete' : 'In Progress'}
                </div>
                <div className="text-xs space-y-1">
                  <div>• Total URLs Found: {totalFiles}</div>
                  <div>• Currently Processing: {processedCount} URLs</div>
                  <div>• Successfully Processed: {successfulFiles} URLs</div>
                  <div>• Redirects Encountered: {warningFiles}</div>
                  <div>• Errors Found: {errorFiles}</div>
                  <div>• Overall Progress: {processingProgress}% Complete</div>
                </div>
              </div>
              {sortedLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 rounded bg-terminal-bg/50 p-2 hover:bg-terminal-bg/70 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <span className={`${getStatusColor(log.status)} min-w-[3rem] font-medium`}>
                      [{log.status}]
                    </span>
                  </span>
                  <span className="text-terminal-text/50 min-w-[150px]">{log.timestamp}</span>
                  <span className="break-all hover:text-terminal-text/80 transition-colors">
                    {log.url}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
