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
    
    // Increased limit to 5000 URLs and using more efficient parameters
    const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=text&fl=original&collapse=urlkey&limit=5000&fastLatest=true`;
    
    const response = await fetch(waybackUrl, {
      headers: {
        'User-Agent': 'WaybackArchiveBot/2.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Wayback Machine API error: ${response.status}`);
    }

    const text = await response.text();
    const urls = text.split('\n')
      .filter(url => url.trim() !== '')
      .sort((a, b) => a.localeCompare(b));

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