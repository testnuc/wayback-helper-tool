import { useState } from "react";
import { toast } from "sonner";
import { UrlInput } from "@/components/UrlInput";
import { Terminal } from "@/components/Terminal";
import { ContentTypeButtons } from "@/components/ContentTypeButtons";

interface WaybackResult {
  timestamp: string;
  status: number;
  url: string;
  contentType: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<WaybackResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const fetchWaybackUrls = async (url: string) => {
    setIsLoading(true);
    try {
      // In a real implementation, we would call the Wayback Machine API
      // For demo purposes, we'll simulate some results
      const mockResults: WaybackResult[] = [
        {
          timestamp: "2023-01-01 12:00:00",
          status: 200,
          url: `${url}/script.js`,
          contentType: "js"
        },
        {
          timestamp: "2023-01-02 12:00:00",
          status: 301,
          url: `${url}/data.json`,
          contentType: "json"
        },
        {
          timestamp: "2023-01-03 12:00:00",
          status: 404,
          url: `${url}/image.png`,
          contentType: "images"
        },
        // Add more mock results as needed
      ];
      
      setResults(mockResults);
      toast.success("URLs fetched successfully!");
    } catch (error) {
      toast.error("Failed to fetch URLs");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCounts = () => ({
    js: results.filter(r => r.contentType === "js").length,
    json: results.filter(r => r.contentType === "json").length,
    text: results.filter(r => r.contentType === "text").length,
    images: results.filter(r => r.contentType === "images").length,
    videos: results.filter(r => r.contentType === "videos").length,
    pdfs: results.filter(r => r.contentType === "pdfs").length,
    others: results.filter(r => !["js", "json", "text", "images", "videos", "pdfs"].includes(r.contentType)).length,
  });

  const filteredResults = activeFilter
    ? results.filter(r => r.contentType === activeFilter)
    : results;

  return (
    <div className="min-h-screen bg-terminal-bg p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-terminal-text mb-8">
          Wayback Machine URL Analyzer
        </h1>
        
        <UrlInput onFetch={fetchWaybackUrls} isLoading={isLoading} />
        
        {results.length > 0 && (
          <ContentTypeButtons
            counts={getCounts()}
            onFilter={setActiveFilter}
            activeFilter={activeFilter}
          />
        )}
        
        <Terminal logs={filteredResults.map(({ timestamp, status, url }) => ({
          timestamp,
          status,
          url
        }))} />
      </div>
    </div>
  );
};

export default Index;