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

const checkUrlStatus = async (url: string): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke('wayback', {
      body: { checkUrl: url }
    });

    if (error) {
      console.error('Error checking URL status:', error);
      return 404;
    }

    return data.status;
  } catch (error) {
    console.error(`Error checking URL status for ${url}:`, error);
    return 404;
  }
};

const fetchWaybackPage = async (domain: string, from: number): Promise<string[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('wayback', {
      body: {
        domain,
        offset: from,
        limit: 25 // Reduced from 50 to 25 for less resource usage
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
  const MAX_URLS = 250; // Reduced from 500 to 250
  const BATCH_DELAY = 1000; // Increased from 500ms to 1000ms for better stability

  console.log('Starting URL collection for domain:', domain);
  onProgress(5);

  while (hasMore && consecutiveEmptyResponses < 3 && allUrls.length < MAX_URLS) {
    try {
      const urls = await fetchWaybackPage(domain, offset);
      
      if (urls.length === 0) {
        consecutiveEmptyResponses++;
        if (consecutiveEmptyResponses >= 3) {
          console.log('No more URLs found after 3 empty responses');
          hasMore = false;
        }
      } else {
        consecutiveEmptyResponses = 0;
        allUrls = [...allUrls, ...urls];
        offset += 25; // Adjusted for new batch size
        progressCounter += urls.length;
        const collectionProgress = Math.min(40, (progressCounter / MAX_URLS) * 40);
        onProgress(collectionProgress);
        console.log(`Collected ${progressCounter} URLs (${Math.round(collectionProgress)}% complete)...`);
        
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    } catch (error) {
      console.error('Error in URL collection:', error);
      hasMore = false;
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }

  allUrls = [...new Set(allUrls)].filter(url => isValidUrl(url.trim()));
  console.log(`Total unique valid URLs found: ${allUrls.length}`);

  const processedResults: WaybackResult[] = [];
  const totalUrls = Math.min(allUrls.length, MAX_URLS);
  const BATCH_SIZE = 3; // Reduced from 5 to 3 for less resource usage

  for (let i = 0; i < totalUrls; i += BATCH_SIZE) {
    const batch = allUrls.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (url) => {
      const trimmedUrl = url.trim();
      try {
        const status = await checkUrlStatus(trimmedUrl);
        return {
          timestamp: new Date().toLocaleString(),
          status,
          url: trimmedUrl,
          contentType: getContentType(trimmedUrl)
        };
      } catch (error) {
        console.error(`Error processing URL ${trimmedUrl}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter((result): result is WaybackResult => result !== null);
    processedResults.push(...validResults);

    const progress = 40 + ((i / totalUrls) * 60);
    onProgress(Math.min(100, progress));
    console.log(`Processing progress: ${Math.round(progress)}%`);
    
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
  }

  console.log(`Successfully processed ${processedResults.length} valid URLs out of ${totalUrls} total URLs`);
  return processedResults;
};