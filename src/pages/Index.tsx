import { useState } from "react";
import { toast } from "sonner";
import { UrlInput } from "@/components/UrlInput";
import { Terminal } from "@/components/Terminal";
import { ContentTypeButtons } from "@/components/ContentTypeButtons";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processWaybackData = (data: string): WaybackResult[] => {
    if (!data || data.trim() === '') {
      throw new Error('No archived URLs found for this domain');
    }

    // Split the text response into lines and process each line
    return data.split('\n')
      .filter(line => line.trim() !== '')
      .map(url => {
        // Since we're only getting URLs, we'll set some default values
        return {
          timestamp: new Date().toLocaleString(), // Current time as default
          status: 200, // Default status
          url: url.trim(),
          contentType: "others" // Default content type
        };
      });
  };

  const fetchWaybackUrls = async (domain: string) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setResults([]);
    
    try {
      setProgress(20);
      
      if (!domain.trim()) {
        throw new Error('Please enter a valid domain');
      }
      
      // Clean the domain - remove protocol and trailing slashes
      const cleanDomain = domain.trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
      
      // Construct the Wayback Machine API URL with the exact format
      const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${cleanDomain}/*&output=text&fl=original&collapse=urlkey`;
      
      // Use a CORS proxy
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(waybackUrl)}`;
      
      setProgress(40);
      
      console.log('Fetching URL:', proxyUrl);
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
      });
      
      setProgress(60);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      console.log('Response size:', text.length, 'bytes');
      
      if (!text || text.trim() === '') {
        throw new Error('No archived data found for this domain');
      }

      setProgress(80);
      
      const waybackResults = processWaybackData(text);
      console.log(`Successfully processed ${waybackResults.length} URLs`);
      
      setProgress(100);
      setResults(waybackResults);
      toast.success(`Found ${waybackResults.length} archived URLs!`);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch URLs from Wayback Machine. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Wayback Machine URL Analyzer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <UrlInput onFetch={fetchWaybackUrls} isLoading={isLoading} />
            
            {isLoading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  Processing domain... {progress}%
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <ContentTypeButtons
                counts={getCounts()}
                onFilter={setActiveFilter}
                activeFilter={activeFilter}
              />
            </CardContent>
          </Card>
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