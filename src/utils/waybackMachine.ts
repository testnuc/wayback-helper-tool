import { supabase } from "@/integrations/supabase/client";

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
        limit: 500 // Reduced chunk size for better reliability
      }
    });

    if (error) throw error;
    return data.urls || [];
  } catch (error) {
    console.error('Error fetching wayback page:', error);
    throw error;
  }
};

const checkUrlStatus = async (url: string): Promise<number> => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors'
    });
    return response.status;
  } catch (error) {
    console.error(`Error checking URL status for ${url}:`, error);
    return 404;
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

  console.log('Starting URL collection for domain:', domain);

  while (hasMore && consecutiveEmptyResponses < 3) {
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
        offset += 500;
        progressCounter += urls.length;
        onProgress(Math.min(40, (progressCounter / 1000) * 40));
        console.log(`Collected ${progressCounter} URLs so far...`);
        
        // Add a small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error in URL collection:', error);
      hasMore = false;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Remove duplicates and invalid URLs
  allUrls = [...new Set(allUrls)].filter(url => isValidUrl(url.trim()));
  console.log(`Total unique valid URLs found: ${allUrls.length}`);

  const processedResults: WaybackResult[] = [];
  const totalUrls = allUrls.length;
  const BATCH_SIZE = 25;

  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
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
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`Successfully processed ${processedResults.length} valid URLs out of ${totalUrls} total URLs`);
  return processedResults;
};
