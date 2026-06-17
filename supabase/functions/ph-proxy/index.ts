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
      // Drop host-specific + hop-by-hop + length/encoding (fetch recomputes them
      // from the buffered body; stale values cause PostHog to read 0 bytes and
      // respond "request missing data payload").
      if (
        lk === 'host' ||
        lk === 'authorization' ||
        lk === 'apikey' ||
        lk === 'content-length' ||
        lk === 'content-encoding' ||
        lk === 'accept-encoding' ||
        lk === 'connection' ||
        lk === 'transfer-encoding' ||
        lk.startsWith('x-forwarded') ||
        lk.startsWith('cf-') ||
        lk.startsWith('sb-')
      ) continue
      fwdHeaders.set(k, v)
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const bodyBuf = hasBody ? await req.arrayBuffer() : undefined

    const init: RequestInit = {
      method: req.method,
      headers: fwdHeaders,
      body: bodyBuf && bodyBuf.byteLength > 0 ? bodyBuf : undefined,
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
