import { WaybackResult } from '../types/wayback';

const MAX_RETRIES = 3;
const CHUNK_SIZE = 1000;
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024; // 50MB limit

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  const filename = url.split('/').pop()?.toLowerCase() || '';
  
  // Backup and Logs
  if (['log', 'bak', 'backup'].includes(extension) || filename.endsWith('config.old')) {
    return 'backup';
  }
  
  // Certificate and Security Files
  if (['crt', 'pem', 'key', 'pub'].includes(extension)) {
    return 'security';
  }
  
  // Configuration Files
  if (['conf', 'config', 'htpasswd', 'htaccess', 'env', 'inc'].includes(extension)) {
    return 'config';
  }
  
  // Existing file types
  if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
    return 'js';
  }
  if (extension === 'json') {
    return 'json';
  }
  if (['txt', 'md', 'csv', 'html', 'xml', 'css', 'scss', 'less'].includes(extension)) {
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
  if (['xls', 'xlsx', 'xlsm', 'xlsb'].includes(extension)) {
    return 'excel';
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
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const proxyUrl = proxyUrls[retryCount % proxyUrls.length];
    console.log(`Attempt ${retryCount + 1}, using proxy: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
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

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        await sleep(2000 * (retryCount + 1)); // Exponential backoff
        return fetchWithRetry(url, retryCount + 1);
      }
    }
    throw error;
  }
};
