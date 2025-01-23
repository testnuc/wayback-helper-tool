import { WaybackResult } from '../types/wayback';

const MAX_RETRIES = 3;
const CHUNK_SIZE = 1000;
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024; // 50MB limit
const TIMEOUT_MS = 30000; // 30 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  const filename = url.split('/').pop()?.toLowerCase() || '';
  
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

export const processWaybackData = async (
  data: string,
  onProgress: (progress: number) => void
): Promise<WaybackResult[]> => {
  if (!data || data.trim() === '') {
    throw new Error('No archived URLs found for this domain');
  }

  const lines = data.split('\n').filter(line => line.trim() !== '');
  const totalLines = lines.length;
  const processedResults: WaybackResult[] = [];

  // Process in chunks to prevent UI freezing
  for (let i = 0; i < totalLines; i += CHUNK_SIZE) {
    const chunk = lines.slice(i, i + CHUNK_SIZE);
    const chunkResults = chunk.map(url => ({
      timestamp: new Date().toLocaleString(),
      status: 200,
      url: url.trim(),
      contentType: getContentType(url.trim())
    }));

    processedResults.push(...chunkResults);
    const progress = Math.min(80 + (i / totalLines) * 20, 100);
    onProgress(progress);
    await sleep(0); // Allow UI to update
  }

  return processedResults;
};

export const fetchWithRetry = async (url: string, retryCount = 0): Promise<Response> => {
  // Updated list of CORS proxies with more reliable options
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://thingproxy.freeboard.io/fetch/${url}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://proxy.cors.sh/${url}`,
    `https://cors.bridged.cc/${url}`,
    `https://crossorigin.me/${url}`,
    `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}`,
    `https://cors-anywhere.herokuapp.com/${url}`
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const proxyUrl = proxyUrls[retryCount % proxyUrls.length];
    console.log(`Attempt ${retryCount + 1}, using proxy: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'x-requested-with': 'XMLHttpRequest',
        'origin': window.location.origin,
        'x-cors-grida-api-key': 'xxxxxxxxxxx', // Add your API key if using cors.bridged.cc
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Proxy error (${response.status}):`, errorBody);
      
      if (response.status === 403) {
        throw new Error('Access denied by CORS proxy. Trying another proxy...');
      }
      if (response.status === 408 || response.status === 504) {
        throw new Error('Request timeout. Trying another proxy...');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error('Response too large. Please try a more specific domain.');
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      // Handle abort error
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to respond.');
      }

      // Retry logic with exponential backoff
      if (retryCount < MAX_RETRIES) {
        console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
        await sleep(backoffTime);
        return fetchWithRetry(url, retryCount + 1);
      }
      
      throw new Error('All CORS proxies failed. Please try again later or use a different domain.');
    }
    throw error;
  }
};