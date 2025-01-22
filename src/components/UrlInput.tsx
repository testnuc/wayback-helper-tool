import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface UrlInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
}

export const UrlInput = ({ onFetch, isLoading }: UrlInputProps) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic domain.com validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    
    if (!domainRegex.test(url.trim())) {
      toast.error("Please enter a valid domain (e.g., domain.com)");
      return;
    }

    onFetch(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-3xl gap-2">
      <Input
        type="text"
        placeholder="Enter domain (e.g., domain.com)..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="font-mono bg-terminal-bg text-terminal-text"
        required
      />
      <Button 
        type="submit" 
        disabled={isLoading}
        className="bg-terminal-success hover:bg-terminal-success/90"
      >
        <Search className="w-4 h-4 mr-2" />
        Fetch
      </Button>
    </form>
  );
};