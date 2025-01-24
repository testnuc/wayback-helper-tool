import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UrlInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
}

export const UrlInput = ({ onFetch, isLoading }: UrlInputProps) => {
  const [url, setUrl] = useState("");

  const storeDomainSearch = async (domain: string) => {
    try {
      const { error } = await supabase
        .from('domain_searches')
        .insert([{ domain }]);

      if (error) {
        console.error('Error storing domain search:', error);
        // Don't show error to user as this is not critical to the main functionality
      }
    } catch (err) {
      console.error('Error in storeDomainSearch:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic domain.com validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    
    const trimmedUrl = url.trim();
    if (!domainRegex.test(trimmedUrl)) {
      toast.error("Please enter a valid domain (e.g., domain.com)");
      return;
    }

    // Store the domain search first
    await storeDomainSearch(trimmedUrl);
    
    // Then proceed with the fetch
    onFetch(trimmedUrl);
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