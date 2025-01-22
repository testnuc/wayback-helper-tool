import { ScrollArea } from "@/components/ui/scroll-area";

interface TerminalProps {
  logs: Array<{
    timestamp: string;
    status: number;
    url: string;
  }>;
}

export const Terminal = ({ logs }: TerminalProps) => {
  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-terminal-success";
    if (status >= 300 && status < 400) return "text-terminal-warning";
    return "text-terminal-error";
  };

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border bg-terminal-bg p-4">
      <div className="font-mono text-sm text-terminal-text">
        {logs.length === 0 ? (
          <div className="flex items-center space-x-2">
            <span className="text-terminal-success">❯</span>
            <span>Waiting for URL input...</span>
            <span className="animate-blink">▊</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-2 mb-2">
              <span className={`${getStatusColor(log.status)} min-w-[3rem]`}>
                [{log.status}]
              </span>
              <span className="text-terminal-text/50">{log.timestamp}</span>
              <span className="break-all">{log.url}</span>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
};