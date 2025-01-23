import { supabase } from "@/integrations/supabase/client";
import { WaybackResult } from "../types/wayback";

export const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  // Simplified content type detection for speed
  if (extension.match(/^(css|js|jsx|ts|tsx|json|jpg|jpeg|png|gif|svg|webp|ico|bmp|mp4|webm|ogg|mov|avi|wmv|pdf|doc|docx|txt|md|xls|xlsx|csv|bak|backup|old|tmp|config|env|ini|key|pem|crt|cert)$/)) {
    return extension;
  }
  return 'others';
};

export const processWaybackData = async (
  domain: string,
  onProgress: (progress: number) => void
): Promise<WaybackResult[]> => {
  try {
    console.log('Starting URL collection for domain:', domain);
    onProgress(10);

    const { data, error } = await supabase.functions.invoke('wayback', {
      body: { domain }
    });

    if (error) throw error;

    onProgress(50);

    const urls = data.urls || [];
    console.log(`Found ${urls.length} URLs`);

    // Process URLs in a single batch for speed
    const results: WaybackResult[] = urls.map(url => ({
      timestamp: new Date().toLocaleString(),
      status: 200, // We're not checking status anymore
      url: url.trim(),
      contentType: getContentType(url.trim())
    }));

    onProgress(100);
    console.log(`Successfully processed ${results.length} URLs`);
    return results;

  } catch (error) {
    console.error('Error in URL collection:', error);
    throw error;
  }
};