import { supabase } from "@/integrations/supabase/client";
import { WaybackResult } from "../types/wayback";

const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  // Fast content type detection using object lookup
  const contentTypes: { [key: string]: string } = {
    css: 'css',
    js: 'js',
    jsx: 'js',
    ts: 'js',
    tsx: 'js',
    json: 'json',
    jpg: 'images',
    jpeg: 'images',
    png: 'images',
    gif: 'images',
    svg: 'images',
    webp: 'images',
    ico: 'images',
    mp4: 'videos',
    webm: 'videos',
    ogg: 'videos',
    mov: 'videos',
    pdf: 'pdfs',
    doc: 'text',
    docx: 'text',
    txt: 'text',
    md: 'text',
    xls: 'excel',
    xlsx: 'excel',
    csv: 'excel',
    bak: 'backup',
    backup: 'backup',
    old: 'backup',
    config: 'config',
    env: 'config',
    ini: 'config',
    key: 'security',
    pem: 'security',
    crt: 'security',
    cert: 'security'
  };

  return contentTypes[extension] || 'others';
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

    // Process URLs in parallel for better performance
    const results: WaybackResult[] = await Promise.all(
      urls.map(async (url: string) => ({
        timestamp: new Date().toLocaleString(),
        status: 200,
        url: url.trim(),
        contentType: getContentType(url.trim())
      }))
    );

    onProgress(100);
    console.log(`Successfully processed ${results.length} URLs`);
    return results;

  } catch (error) {
    console.error('Error in URL collection:', error);
    throw error;
  }
};