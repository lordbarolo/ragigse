// PostHog reverse proxy — gör analytics-anrop osynliga för adblockers
// Klient skickar till: https://<project>.supabase.co/functions/v1/ph-proxy/<phpath>
// Vi forwardar till: https://eu.i.posthog.com/<phpath>
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const PH_HOST = 'https://eu.i.posthog.com'
const ASSET_HOST = 'https://eu-assets.i.posthog.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    // Strip everything up to and including "/ph-proxy"
    const idx = url.pathname.indexOf('/ph-proxy')
    const phPath = idx >= 0 ? url.pathname.slice(idx + '/ph-proxy'.length) : url.pathname
    const target = (phPath.startsWith('/static/') ? ASSET_HOST : PH_HOST) + (phPath || '/') + url.search

    // Forward request body/method/headers (minus host-specific)
    const fwdHeaders = new Headers()
    for (const [k, v] of req.headers) {
      const lk = k.toLowerCase()
      if (lk === 'host' || lk === 'authorization' || lk === 'apikey' || lk.startsWith('x-forwarded')) continue
      fwdHeaders.set(k, v)
    }

    const init: RequestInit = {
      method: req.method,
      headers: fwdHeaders,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer(),
    }

    const resp = await fetch(target, init)
    const respHeaders = new Headers(resp.headers)
    for (const [k, v] of Object.entries(corsHeaders)) respHeaders.set(k, v)
    return new Response(resp.body, { status: resp.status, headers: respHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
