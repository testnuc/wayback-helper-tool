import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      throw new Error('Domain is required');
    }

    console.log(`Fetching URLs for domain: ${domain}`);
    
    // Optimized URL fetching with increased limit and efficient parameters
    const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=text&fl=original&collapse=urlkey&limit=10000&fastLatest=true&filter=statuscode:200`;
    
    const response = await fetch(waybackUrl, {
      headers: {
        'User-Agent': 'WaybackArchiveBot/2.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Wayback Machine API error: ${response.status}`);
    }

    const text = await response.text();
    // Pre-allocate array size for better performance
    const urls = new Set(text.split('\n').filter(Boolean));

    console.log(`Found ${urls.size} unique URLs`);
    
    return new Response(
      JSON.stringify({ urls: Array.from(urls) }),
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