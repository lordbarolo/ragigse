import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'CompCare'
const FROM_EMAIL = 'CompCare <noreply@mail.compcare.se>'
const RESEND_GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend/emails'

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (!forwarded) return 'unknown'
  return forwarded.split(',')[0]?.trim() || 'unknown'
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY_1') || Deno.env.get('RESEND_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!lovableApiKey || !resendApiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables', {
      hasLovableKey: !!lovableApiKey,
      hasResendKey: !!resendApiKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let email = ''
  try {
    const body = await req.json()
    email = String(body?.email || '').trim().toLowerCase()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Valid email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const clientIp = getClientIp(req)
  const rateLimit = await checkRateLimit(supabase, 'send-password-recovery', clientIp, 5, 60)

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit, corsHeaders)
  }

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    filter: `email.eq.${email}`,
    page: 1,
  })

  if (listError) {
    console.error('Failed to look up auth user', listError)
    return new Response(JSON.stringify({ error: 'Failed to process password recovery' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!existingUsers?.users?.length) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const requestOrigin = req.headers.get('origin') || 'https://www.compcare.se'
  const resetUrl = new URL('/aterstall-losenord', requestOrigin)

  const { data: recoveryLinkData, error: recoveryError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: resetUrl.toString() },
  })

  if (recoveryError) {
    console.error('Failed to generate recovery link', recoveryError)
    return new Response(JSON.stringify({ error: 'Failed to process password recovery' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const hashedToken = recoveryLinkData?.properties?.hashed_token
  if (!hashedToken) {
    console.error('Missing recovery hashed_token in generateLink response')
    return new Response(JSON.stringify({ error: 'Failed to process password recovery' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const confirmationUrl = new URL(resetUrl)
  confirmationUrl.searchParams.set('token_hash', hashedToken)
  confirmationUrl.searchParams.set('type', 'recovery')

  const html = await renderAsync(
    React.createElement(RecoveryEmail, {
      siteName: SITE_NAME,
      confirmationUrl: confirmationUrl.toString(),
    })
  )

  const text = await renderAsync(
    React.createElement(RecoveryEmail, {
      siteName: SITE_NAME,
      confirmationUrl,
    }),
    { plainText: true }
  )

  const sendResponse = await fetch(RESEND_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': resendApiKey,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Återställ ditt lösenord',
      html,
      text,
    }),
  })

  if (!sendResponse.ok) {
    const errorBody = await sendResponse.text()
    console.error('Failed to send recovery email', { status: sendResponse.status, errorBody })
    return new Response(JSON.stringify({ error: 'Failed to send password recovery email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
