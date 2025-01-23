import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const TIMEOUT_MS = 15000; // 15 seconds timeout

async function fetchWithRetry(url: string, options: any, retries = MAX_RETRIES): Promise<Response> {
  try {
    console.log(`Attempting to fetch ${url}, retries left: ${retries}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    if (retries > 0 && error.name === 'AbortError') {
      console.log(`Retrying fetch for ${url}, ${retries - 1} retries left`);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domain, offset, limit, checkUrl } = await req.json();

    // If it's a URL status check request
    if (checkUrl) {
      console.log('Checking URL status:', checkUrl);
      try {
        const response = await fetchWithRetry(checkUrl, {
          method: 'HEAD',
          redirect: 'follow'
        });
        
        return new Response(
          JSON.stringify({ status: response.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error checking URL status:', error);
        return new Response(
          JSON.stringify({ status: 404, error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If it's a wayback machine request
    if (!domain) {
      throw new Error('Domain is required');
    }

    console.log('Fetching from Wayback Machine:', domain, offset, limit);
    
    const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=text&fl=original&collapse=urlkey&offset=${offset || 0}&limit=${limit || 50}`;
    
    const response = await fetchWithRetry(waybackUrl, {
      headers: {
        'User-Agent': 'WaybackArchiveBot/1.0',
      }
    });

    if (!response.ok) {
      throw new Error(`Wayback Machine API error: ${response.status}`);
    }

    const text = await response.text();
    const urls = text.split('\n').filter(url => url.trim() !== '');

    console.log(`Found ${urls.length} URLs for domain ${domain} at offset ${offset}`);
    return new Response(
      JSON.stringify({ urls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wayback function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});