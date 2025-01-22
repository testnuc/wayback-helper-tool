import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";

interface TerminalProps {
  logs: Array<{
    timestamp: string;
    status: number;
    url: string;
  }>;
}

export const Terminal = ({ logs }: TerminalProps) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-terminal-success";
    if (status >= 300 && status < 400) return "text-terminal-warning";
    return "text-terminal-error";
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
            <div className="flex items-center justify-center space-x-2 py-8">
              <span className="text-terminal-success">❯</span>
              <span>Waiting for URL input...</span>
              <span className="animate-blink">▊</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-terminal-text/50 mb-4">
                Processing complete. Found {totalFiles} archived URLs.
              </div>
              {sortedLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 rounded bg-terminal-bg/50 p-2 hover:bg-terminal-bg/70 transition-colors"
                >
                  <span className={`${getStatusColor(log.status)} min-w-[3rem] font-medium`}>
                    [{log.status}]
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