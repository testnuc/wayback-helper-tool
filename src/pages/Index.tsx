import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { UrlInput } from "@/components/UrlInput";
import { Terminal } from "@/components/Terminal";
import { ContentTypeButtons } from "@/components/ContentTypeButtons";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WaybackResult } from "../types/wayback";
import { processWaybackData } from "../utils/waybackMachine";
import { FeedbackForm } from "@/components/FeedbackForm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Ripple } from "@/components/Ripple";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<WaybackResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error: any) {
      toast.error("Error logging out");
    }
  };

  const storeDomainSearch = async (domain: string) => {
    try {
      const { error } = await supabase
        .from("domain_searches")
        .insert([{ domain }]);

      if (error) throw error;
    } catch (err) {
      console.error("Error storing domain search:", err);
      // Don't show error to user as this is not critical
    }
  };

  const fetchWaybackUrls = async (domain: string) => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setResults([]);
    
    try {
      await storeDomainSearch(domain);
      setProgress(10);
      
      if (!domain.trim()) {
        throw new Error('Please enter a valid domain');
      }
      
      const cleanDomain = domain.trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
      
      console.log('Fetching ALL Wayback Machine data for domain:', cleanDomain);
      
      const waybackResults = await processWaybackData(cleanDomain, setProgress);
      console.log(`Successfully processed ${waybackResults.length} URLs`);
      
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
    <div className="min-h-screen bg-background p-8 relative">
      <Ripple count={5} color="bg-primary/5" />
      <div className="max-w-6xl mx-auto space-y-8">
        {/* About Section */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Discover and analyze archived URLs from the Wayback Machine</span>
        </div>

        <div className="flex justify-between items-center">
          <Card className="flex-1">
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
          <Button
            variant="ghost"
            size="icon"
            className="ml-4"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {results.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <ContentTypeButtons
                counts={{
                  js: results.filter(r => r.contentType === "js").length,
                  css: results.filter(r => r.contentType === "css").length,
                  json: results.filter(r => r.contentType === "json").length,
                  text: results.filter(r => r.contentType === "text").length,
                  html: results.filter(r => r.contentType === "html").length,
                  images: results.filter(r => r.contentType === "images").length,
                  videos: results.filter(r => r.contentType === "videos").length,
                  pdfs: results.filter(r => r.contentType === "pdfs").length,
                  excel: results.filter(r => r.contentType === "excel").length,
                  backup: results.filter(r => r.contentType === "backup").length,
                  security: results.filter(r => r.contentType === "security").length,
                  config: results.filter(r => r.contentType === "config").length,
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

        <Card>
          <CardHeader>
            <CardTitle>Request a Feature</CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
