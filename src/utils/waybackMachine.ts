import { supabase } from "@/integrations/supabase/client";
import { WaybackResult } from "../types/wayback";

export const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  const filename = url.split('/').pop()?.toLowerCase() || '';
  
  if (extension === 'css' || filename.includes('.css') || url.includes('/css/')) return 'css';
  if (extension === 'html' || extension === 'htm') return 'html';
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) return 'js';
  if (extension === 'json') return 'json';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(extension)) return 'images';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(extension)) return 'videos';
  if (extension === 'pdf') return 'pdfs';
  if (['doc', 'docx', 'txt', 'md'].includes(extension)) return 'text';
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'excel';
  if (['bak', 'backup', 'old', 'tmp'].includes(extension)) return 'backup';
  if (['config', 'env', 'ini'].includes(extension)) return 'config';
  if (['key', 'pem', 'crt', 'cert'].includes(extension)) return 'security';
  
  return 'others';
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const fetchWaybackPage = async (domain: string, from: number): Promise<string[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('wayback', {
      body: {
        domain,
        offset: from
      }
    });

    if (error) throw error;
    return data.urls || [];
  } catch (error) {
    console.error('Error fetching wayback page:', error);
    throw error;
  }
};

export const processWaybackData = async (
  domain: string,
  onProgress: (progress: number) => void
): Promise<WaybackResult[]> => {
  let allUrls: string[] = [];
  let offset = 0;
  let hasMore = true;
  const MAX_URLS = 1000; // Increased limit for more comprehensive results
  const BATCH_SIZE = 200; // Increased batch size for faster collection

  console.log('Starting URL collection for domain:', domain);
  onProgress(5);

  while (hasMore && allUrls.length < MAX_URLS) {
    try {
      const urls = await fetchWaybackPage(domain, offset);
      
      if (urls.length === 0) {
        hasMore = false;
      } else {
        allUrls = [...new Set([...allUrls, ...urls])];
        offset += BATCH_SIZE;
        const progress = Math.min(90, (allUrls.length / MAX_URLS) * 90);
        onProgress(progress);
        console.log(`Collected ${allUrls.length} URLs (${Math.round(progress)}% complete)...`);
        
        if (allUrls.length >= MAX_URLS) {
          console.log(`Reached maximum URL limit of ${MAX_URLS}`);
          hasMore = false;
        }
      }
    } catch (error) {
      console.error('Error in URL collection:', error);
      if (allUrls.length > 0) {
        hasMore = false;
      } else {
        throw error;
      }
    }
  }

  allUrls = [...new Set(allUrls)].filter(url => isValidUrl(url.trim())).slice(0, MAX_URLS);
  console.log(`Total unique valid URLs found: ${allUrls.length}`);

  const processedResults: WaybackResult[] = allUrls.map(url => ({
    timestamp: new Date().toLocaleString(),
    status: 200,
    url: url.trim(),
    contentType: getContentType(url.trim())
  }));

  onProgress(100);
  console.log(`Successfully processed ${processedResults.length} URLs`);
  return processedResults;
};