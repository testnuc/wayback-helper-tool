import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { domain, offset, limit } = await req.json();

    if (!domain) {
      throw new Error('Domain is required');
    }

    console.log(`Fetching URLs for domain: ${domain}, offset: ${offset}, limit: ${limit}`);
    
    const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=text&fl=original&collapse=urlkey&offset=${offset || 0}&limit=${limit || 50}`;
    
    const response = await fetch(waybackUrl, {
      headers: {
        'User-Agent': 'WaybackArchiveBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Wayback Machine API error: ${response.status}`);
    }

    const text = await response.text();
    const urls = text.split('\n').filter(url => url.trim() !== '');

    console.log(`Found ${urls.length} URLs`);
    
    return new Response(
      JSON.stringify({ urls }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in wayback function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});