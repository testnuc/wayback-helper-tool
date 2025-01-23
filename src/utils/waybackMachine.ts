import { WaybackResult } from '../types/wayback';

const MAX_RETRIES = 5;
const CHUNK_SIZE = 500; // Reduced from 1000 for better reliability
const TIMEOUT_MS = 45000; // Increased timeout to 45 seconds
const BATCH_SIZE = 25; // Reduced batch size for better reliability

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      timeout: 10000,
    });
    return response.status;
  } catch (error) {
    console.error(`Error checking URL status for ${url}:`, error);
    return 404;
  }
};

export const fetchWithRetry = async (url: string, retryCount = 0): Promise<Response> => {
  // Updated list of CORS proxies with more reliable options
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://cors-anywhere.herokuapp.com/${encodeURIComponent(url)}`,
    `https://crossorigin.me/${encodeURIComponent(url)}`,
    `https://yacdn.org/proxy/${encodeURIComponent(url)}`,
    `https://cors.eu.org/${encodeURIComponent(url)}`
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const proxyUrl = proxyUrls[retryCount % proxyUrls.length];
    console.log(`Attempt ${retryCount + 1}, using proxy: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (compatible; WaybackArchiveBot/1.0)',
        'Origin': window.location.origin,
        'X-Requested-With': 'XMLHttpRequest'
      },
      signal: controller.signal,
      credentials: 'omit'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Proxy error (${response.status}):`, errorBody);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error('Empty response from proxy');
    }

    return new Response(text);

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      console.error('Fetch error:', error.message);
      
      if (error.name === 'AbortError') {
        console.log('Request timed out, trying next proxy...');
      }

      if (retryCount < MAX_RETRIES) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 15000);
        console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}, waiting ${backoffTime}ms`);
        await sleep(backoffTime);
        return fetchWithRetry(url, retryCount + 1);
      }
    }
    throw new Error('All proxies failed. Please try again later.');
  }
};

const fetchWaybackPage = async (domain: string, from: number): Promise<string[]> => {
  const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=text&fl=original&collapse=urlkey&offset=${from}&limit=${CHUNK_SIZE}`;
  
  try {
    const response = await fetchWithRetry(waybackUrl);
    const text = await response.text();
    return text.split('\n').filter(line => line.trim() !== '');
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
        offset += CHUNK_SIZE;
        progressCounter += urls.length;
        onProgress(Math.min(40, (progressCounter / 1000) * 40));
        console.log(`Collected ${progressCounter} URLs so far...`);
        
        // Add a small delay between requests to avoid overwhelming the server
        await sleep(1000);
      }
    } catch (error) {
      console.error('Error in URL collection:', error);
      if (error instanceof Error && error.message.includes('All proxies failed')) {
        hasMore = false;
      }
      await sleep(5000); // Wait longer on error before retrying
    }
  }

  // Remove duplicates and invalid URLs
  allUrls = [...new Set(allUrls)].filter(url => isValidUrl(url.trim()));
  console.log(`Total unique valid URLs found: ${allUrls.length}`);

  const processedResults: WaybackResult[] = [];
  const totalUrls = allUrls.length;

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
    
    await sleep(500);
  }

  console.log(`Successfully processed ${processedResults.length} valid URLs out of ${totalUrls} total URLs`);
  return processedResults;
};
