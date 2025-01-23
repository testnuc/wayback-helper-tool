import { supabase } from "@/integrations/supabase/client";
import { WaybackResult } from "../types/wayback";

export const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  const filename = url.split('/').pop()?.toLowerCase() || '';
  
  // CSS files
  if (extension === 'css' || filename.includes('.css') || url.includes('/css/')) {
    return 'css';
  }
  
  // HTML files
  if (extension === 'html' || extension === 'htm') {
    return 'html';
  }
  
  // Backup and Logs
  if ([
    'log', 'bak', 'backup', 'swp', 'lock', 'passwords', 'keys', 'ssh',
    'json.bak', 'config.old'
  ].includes(extension) || filename.includes('backup')) {
    return 'backup';
  }
  
  // Certificate and Security Files
  if ([
    'crt', 'pem', 'key', 'pub', 'asc', 'htpasswd', 'htaccess'
  ].includes(extension)) {
    return 'security';
  }
  
  // Configuration Files
  if ([
    'conf', 'config', 'env', 'inc', 'ini', 'bat', 'sh', 'yaml'
  ].includes(extension)) {
    return 'config';
  }
  
  // Spreadsheets and Data Files
  if ([
    'xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'xml'
  ].includes(extension)) {
    return 'excel';
  }
  
  // Documents
  if ([
    'doc', 'docx', 'ppt', 'md'
  ].includes(extension)) {
    return 'text';
  }
  
  // Database Files
  if ([
    'sql', 'db', 'sqlite', 'sqlite3', 'db3', 'git'
  ].includes(extension)) {
    return 'backup';
  }
  
  // Archives and Packages
  if ([
    'zip', 'tar', 'gz', 'deb', 'rpm', 'iso', 'img', 'apk', 'msi', 'dmg', 'tmp'
  ].includes(extension)) {
    return 'backup';
  }
  
  // Executables and Binaries
  if ([
    'exe', 'dll', 'bin'
  ].includes(extension)) {
    return 'others';
  }
  
  // Checksums
  if (extension === 'md5') {
    return 'security';
  }
  
  // Existing file types
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
    return 'js';
  }
  if (extension === 'json') {
    return 'json';
  }
  if (['txt', 'xml', 'css', 'scss', 'less'].includes(extension)) {
    return 'text';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(extension)) {
    return 'images';
  }
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'].includes(extension)) {
    return 'videos';
  }
  if (extension === 'pdf') {
    return 'pdfs';
  }
  
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
        offset: from,
        limit: 100 // Increased limit for faster collection
      }
    });

    if (error) {
      console.error('Error from wayback function:', error);
      throw error;
    }

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
  let progressCounter = 0;
  let consecutiveEmptyResponses = 0;
  const MAX_URLS = 500; // Increased limit since we're not checking status
  const BATCH_SIZE = 50; // Increased batch size

  console.log('Starting URL collection for domain:', domain);
  onProgress(5);

  while (hasMore && consecutiveEmptyResponses < 2 && allUrls.length < MAX_URLS) {
    try {
      const urls = await fetchWaybackPage(domain, offset);
      
      if (urls.length === 0) {
        consecutiveEmptyResponses++;
        if (consecutiveEmptyResponses >= 2) {
          console.log('No more URLs found after 2 empty responses');
          hasMore = false;
        }
      } else {
        consecutiveEmptyResponses = 0;
        allUrls = [...new Set([...allUrls, ...urls])];
        offset += 100;
        progressCounter += urls.length;
        const collectionProgress = Math.min(80, (progressCounter / MAX_URLS) * 80);
        onProgress(collectionProgress);
        console.log(`Collected ${progressCounter} URLs (${Math.round(collectionProgress)}% complete)...`);
        
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

  // Convert URLs directly to results without checking status
  const processedResults: WaybackResult[] = allUrls.map(url => ({
    timestamp: new Date().toLocaleString(),
    status: 200, // Default status since we're not checking
    url: url.trim(),
    contentType: getContentType(url.trim())
  }));

  onProgress(100);
  console.log(`Successfully processed ${processedResults.length} URLs`);
  return processedResults;
};
