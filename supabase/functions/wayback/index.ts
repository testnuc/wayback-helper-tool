import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domain, offset, limit, checkUrl } = await req.json();

    // If it's a URL status check request
    if (checkUrl) {
      console.log('Checking URL status:', checkUrl);
      try {
        const response = await fetch(checkUrl, {
          method: 'HEAD',
          redirect: 'follow'
        });
        return new Response(
          JSON.stringify({ status: response.status }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error checking URL:', error);
        return new Response(
          JSON.stringify({ status: 404 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If it's a wayback machine request
    if (!domain) {
      throw new Error('Domain is required');
    }

    console.log('Fetching from Wayback Machine:', domain, offset, limit);
    const waybackUrl = `https://web.archive.org/cdx/search/cdx?url=*.${domain}/*&output=text&fl=original&collapse=urlkey&offset=${offset || 0}&limit=${limit || 100}`; // Reduced limit to 100
    
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

    console.log(`Found ${urls.length} URLs for domain ${domain}`);
    return new Response(
      JSON.stringify({ urls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in wayback function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});