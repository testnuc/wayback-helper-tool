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