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

const MAX_RETRIES = 5; // Increased from 3
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  // JavaScript files
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
    return 'js';
  }
  
  // JSON files
  if (extension === 'json') {
    return 'json';
  }
  
  // Text files
  if (['txt', 'md', 'csv', 'html', 'xml', 'css', 'scss', 'less'].includes(extension)) {
    return 'text';
  }
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(extension)) {
    return 'images';
  }
  
  // Video files
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(extension)) {
    return 'videos';
  }
  
  // PDF files
  if (extension === 'pdf') {
    return 'pdfs';
  }
  
  return 'others';
};

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
          contentType: getContentType(url.trim())
        };
      });
  };

  const fetchWithRetry = async (url: string, retryCount = 0): Promise<Response> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased timeout to 60 seconds

      // Try different CORS proxies
      const proxyUrls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
      ];

      const proxyUrl = proxyUrls[retryCount % proxyUrls.length];
      console.log(`Attempt ${retryCount + 1}, using proxy: ${proxyUrl}`);

      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Request timed out');
          throw new Error('Request timed out. The server is taking too long to respond.');
        }

        if (retryCount < MAX_RETRIES) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
            MAX_RETRY_DELAY
          );
          console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}, waiting ${delay}ms`);
          await sleep(delay);
          return fetchWithRetry(url, retryCount + 1);
        }
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
      
      setProgress(40);
      
      console.log('Fetching Wayback Machine data for domain:', cleanDomain);
      
      const response = await fetchWithRetry(waybackUrl);
      
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
        if (error.message.includes('timed out')) {
          errorMessage = "The request timed out. Please try again with a different domain or later.";
        } else if (error.message.includes('HTTP error')) {
          errorMessage = "The Wayback Machine service is currently unavailable. Please try again in a few minutes.";
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
    others: results.filter(r => r.contentType === "others").length,
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