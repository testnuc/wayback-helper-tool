import { supabase } from "@/integrations/supabase/client";
import { WaybackResult } from "../types/wayback";

// Optimized content type detection using a Map for O(1) lookup
const contentTypeMap = new Map([
  ['css', 'css'],
  ['js', 'js'],
  ['jsx', 'js'],
  ['ts', 'js'],
  ['tsx', 'js'],
  ['json', 'json'],
  ['jpg', 'images'],
  ['jpeg', 'images'],
  ['png', 'images'],
  ['gif', 'images'],
  ['svg', 'images'],
  ['webp', 'images'],
  ['ico', 'images'],
  ['mp4', 'videos'],
  ['webm', 'videos'],
  ['ogg', 'videos'],
  ['mov', 'videos'],
  ['pdf', 'pdfs'],
  ['doc', 'text'],
  ['docx', 'text'],
  ['txt', 'text'],
  ['md', 'text'],
  ['xls', 'excel'],
  ['xlsx', 'excel'],
  ['csv', 'excel'],
  ['bak', 'backup'],
  ['backup', 'backup'],
  ['old', 'backup'],
  ['config', 'config'],
  ['env', 'config'],
  ['ini', 'config'],
  ['key', 'security'],
  ['pem', 'security'],
  ['crt', 'security'],
  ['cert', 'security']
]);

const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  return contentTypeMap.get(extension) || 'others';
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
    console.log(`Processing ${urls.length} URLs`);

    // Process URLs in chunks for better performance
    const CHUNK_SIZE = 1000;
    const results: WaybackResult[] = [];
    const timestamp = new Date().toLocaleString();

    for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
      const chunk = urls.slice(i, i + CHUNK_SIZE);
      const chunkResults = chunk.map((url: string) => ({
        timestamp,
        status: 200,
        url: url.trim(),
        contentType: getContentType(url.trim())
      }));
      results.push(...chunkResults);
      
      // Update progress based on chunks processed
      const progress = Math.min(50 + Math.floor((i / urls.length) * 50), 99);
      onProgress(progress);
    }

    onProgress(100);
    console.log(`Successfully processed ${results.length} URLs`);
    return results;

  } catch (error) {
    console.error('Error in URL collection:', error);
    throw error;
  }
};