import { useState } from "react";
import { toast } from "sonner";
import { UrlInput } from "@/components/UrlInput";
import { Terminal } from "@/components/Terminal";
import { ContentTypeButtons } from "@/components/ContentTypeButtons";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WaybackResult } from "../types/wayback";
import { processWaybackData, fetchWithRetry } from "../utils/waybackMachine";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<WaybackResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      
      // Add limit parameter to prevent too large responses
      const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${cleanDomain}/*&output=text&fl=original&collapse=urlkey&limit=10000`;
      
      setProgress(40);
      console.log('Fetching Wayback Machine data for domain:', cleanDomain);
      
      const response = await fetchWithRetry(waybackUrl);
      setProgress(60);
      
      const text = await response.text();
      console.log('Response size:', text.length, 'bytes');
      
      if (!text || text.trim() === '') {
        throw new Error('No archived data found for this domain');
      }

      const waybackResults = await processWaybackData(text, setProgress);
      console.log(`Successfully processed ${waybackResults.length} URLs`);
      
      setProgress(100);
      setResults(waybackResults);
      toast.success(`Found ${waybackResults.length} archived URLs!`);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      let errorMessage = "Failed to fetch URLs from Wayback Machine. Please try again later.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
                counts={{
                  js: results.filter(r => r.contentType === "js").length,
                  json: results.filter(r => r.contentType === "json").length,
                  text: results.filter(r => r.contentType === "text").length,
                  images: results.filter(r => r.contentType === "images").length,
                  videos: results.filter(r => r.contentType === "videos").length,
                  pdfs: results.filter(r => r.contentType === "pdfs").length,
                  others: results.filter(r => r.contentType === "others").length,
                }}
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