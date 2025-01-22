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

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    return data.split('\n')
      .filter(line => line.trim() !== '')
      .map(url => {
        return {
          timestamp: new Date().toLocaleString(),
          status: 200,
          url: url.trim(),
          contentType: "others"
        };
      });
  };

  const fetchWithRetry = async (url: string, retries = MAX_RETRIES): Promise<Response> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        console.log(`Retry attempt ${MAX_RETRIES - retries + 1} of ${MAX_RETRIES}`);
        await sleep(RETRY_DELAY);
        return fetchWithRetry(url, retries - 1);
      }
      throw error;
    }
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
      
      const cleanDomain = domain.trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
      
      const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${cleanDomain}/*&output=text&fl=original&collapse=urlkey`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(waybackUrl)}`;
      
      setProgress(40);
      
      console.log('Fetching URL:', proxyUrl);
      
      const response = await fetchWithRetry(proxyUrl);
      
      setProgress(60);
      
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
      let errorMessage = "Failed to fetch URLs from Wayback Machine. Please try again later.";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Network error: Please check your internet connection and try again.";
        } else if (error.message.includes('HTTP error')) {
          errorMessage = "Server error: The Wayback Machine service is currently unavailable. Please try again later.";
        } else {
          errorMessage = error.message;
        }
      }
      
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