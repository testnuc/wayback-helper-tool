import { WaybackResult } from '../types/wayback';

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 10000;
const CHUNK_SIZE = 50;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getContentType = (url: string): string => {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
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

  for (let i = 0; i < totalLines; i += CHUNK_SIZE) {
    const chunk = lines.slice(i, i + CHUNK_SIZE);
    const chunkResults = chunk.map(url => ({
      timestamp: new Date().toLocaleString(),
      status: 200,
      url: url.trim(),
      contentType: getContentType(url.trim())
    }));

    processedResults.push(...chunkResults);
    const currentProgress = Math.min(80 + (i / totalLines) * 20, 100);
    onProgress(currentProgress);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return processedResults;
};

export const fetchWithRetry = async (url: string, retryCount = 0): Promise<Response> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const proxyUrls = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

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
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      throw new Error('Response too large. Please try a more specific domain.');
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The server is taking too long to respond.');
      }

      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
          MAX_RETRY_DELAY
        );
        console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}, waiting ${delay}ms`);
        await sleep(delay);
        return fetchWithRetry(url, retryCount + 1);
      }
    }
    throw error;
  }
};