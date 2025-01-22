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

  const fetchWaybackUrls = async (domain: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&collapse=urlkey`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'GET',
          },
          mode: 'cors',
          credentials: 'omit'
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        toast.error("No archived URLs found for this domain");
        return;
      }
      
      // Skip the first row as it contains column headers
      const waybackResults = data.slice(1).map((item: any) => {
        // CDX API returns: [urlkey, timestamp, original, mimetype, statuscode, digest, length]
        const [, timestamp, url, mimetype, statuscode] = item;
        
        // Determine content type based on mimetype
        let contentType = "others";
        if (mimetype.includes("javascript")) contentType = "js";
        else if (mimetype.includes("json")) contentType = "json";
        else if (mimetype.includes("text")) contentType = "text";
        else if (mimetype.includes("image")) contentType = "images";
        else if (mimetype.includes("video")) contentType = "videos";
        else if (mimetype.includes("pdf")) contentType = "pdfs";

        return {
          timestamp: new Date(timestamp.replace(
            /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
            '$1-$2-$3 $4:$5:$6'
          )).toLocaleString(),
          status: parseInt(statuscode),
          url,
          contentType
        };
      });
      
      setResults(waybackResults);
      toast.success(`Found ${waybackResults.length} archived URLs!`);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch URLs from Wayback Machine. Please try again later.");
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