import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

// Sends app emails DIRECTLY via Resend gateway.
// No pgmq queue, no NS-delegation — just CNAME/TXT on the from-domain in DNS.
//
// Required env:
//  - LOVABLE_API_KEY        (auto-provisioned)
//  - RESEND_API_KEY_1       (connector key, managed by Resend connector)
//  - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// Optional env:
//  - RESEND_FROM_DOMAIN     (default: "compcare.se" — verified root domain in Resend)
//  - RESEND_FROM_NAME       (default: "CompCare")
//  - APP_BASE_URL           (default: "https://compcare.se" — used in unsubscribe links)

const SITE_NAME = Deno.env.get('RESEND_FROM_NAME') || 'CompCare'
const FROM_DOMAIN = Deno.env.get('RESEND_FROM_DOMAIN') || 'compcare.se'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://compcare.se'
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footer = `
    <div style="margin-top:32px;padding:16px 24px;border-top:1px solid #e5e5e5;font-family:Inter,Arial,sans-serif;font-size:12px;color:#888;text-align:center;">
      Du får detta mejl från ${SITE_NAME}.
      <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Avregistrera</a>
    </div>
  `
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`)
  }
  return html + footer
}

function appendUnsubscribeText(text: string, unsubscribeUrl: string): string {
  return `${text}\n\n---\nAvregistrera: ${unsubscribeUrl}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY_1') || Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!lovableApiKey || !resendKey) {
    console.error('Missing Resend gateway credentials')
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Parse request
  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let messageId: string
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    console.error('Template not found', { templateName })
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({
        error: 'recipientEmail is required (unless the template defines a fixed recipient)',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedEmail = effectiveRecipient.toLowerCase()

  // 1. Suppression check (fail-closed)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed', { error: suppressionError })
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Get or create unsubscribe token
  let unsubscribeToken: string
  const { data: existingToken } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    unsubscribeToken = generateToken()
    await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )
    const { data: storedToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()
    unsubscribeToken = storedToken?.token || unsubscribeToken
  } else {
    // Used token but email not in suppression — safety fallback
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message: 'Unsubscribe token used but email not suppressed',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const unsubscribeUrl = `${APP_BASE_URL}/avregistrera?token=${unsubscribeToken}`

  // 3. Render template
  let htmlBody: string
  let textBody: string
  try {
    htmlBody = await renderAsync(React.createElement(template.component, templateData))
    textBody = await renderAsync(
      React.createElement(template.component, templateData),
      { plainText: true }
    )
  } catch (err) {
    console.error('Template render failed', { templateName, error: err })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Template render failed',
    })
    return new Response(
      JSON.stringify({ error: 'Template render failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const html = appendUnsubscribeFooter(htmlBody, unsubscribeUrl)
  const text = appendUnsubscribeText(textBody, unsubscribeUrl)

  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 4. Log pending BEFORE send
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
  })

  // 5. Send via Resend gateway
  const fromAddress = `${SITE_NAME} <noreply@${FROM_DOMAIN}>`

  try {
    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': resendKey,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [effectiveRecipient],
        subject: resolvedSubject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [{ name: 'template', value: templateName.replace(/[^a-zA-Z0-9_-]/g, '_') }],
      }),
    })

    const respText = await resp.text()

    if (!resp.ok) {
      console.error('Resend send failed', {
        status: resp.status,
        body: respText,
        templateName,
        message_id: messageId,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: `Resend ${resp.status}: ${respText.slice(0, 500)}`,
      })
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: respText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let providerId: string | null = null
    try {
      const parsed = JSON.parse(respText)
      providerId = parsed?.id || null
    } catch { /* ignore */ }

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'sent',
      metadata: providerId ? { resend_id: providerId } : null,
    })

    console.log('Email sent via Resend', { templateName, message_id: messageId, resend_id: providerId })

    return new Response(
      JSON.stringify({ success: true, message_id: messageId, resend_id: providerId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Resend gateway error', { error: err, templateName, message_id: messageId })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: `Gateway error: ${(err as Error).message}`,
    })
    return new Response(
      JSON.stringify({ error: 'Email gateway error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
