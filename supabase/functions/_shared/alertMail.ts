// Shared mail-alert helper. Sends a formatted email with a paste-ready
// chat-prompt to Lovable. Used by health-check, edge-error-monitor and
// conversion-monitor.

const ALERT_EMAIL = "anders@compcare.se";
const PROJECT_URL = "https://lovable.dev/projects/f4c1323e-7c72-43ee-978e-fa632a197c62";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

export interface AlertSection {
  title: string;
  rows: Array<{ label: string; value: string; severity?: "error" | "warn" }>;
}

export async function sendChatAlert(opts: {
  subject: string;
  intro: string;
  sections: AlertSection[];
  chatPrompt: string;
  alertId: string;
  to?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    return { ok: false, error: "missing email credentials" };
  }

  const sectionsHtml = opts.sections.map((sec) => `
    <h3 style="margin:20px 0 8px;font-size:15px;">${escapeHtml(sec.title)}</h3>
    <table style="border-collapse:collapse;width:100%;">
      ${sec.rows.map((r) => `
        <tr>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600;width:30%;">${escapeHtml(r.label)}</td>
          <td style="padding:6px 10px;border:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:${r.severity === "error" ? "#c00" : r.severity === "warn" ? "#b80" : "#111"};">${escapeHtml(r.value)}</td>
        </tr>
      `).join("")}
    </table>
  `).join("");

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111;">
    <h2 style="margin:0 0 6px;color:#c00;">🚨 vårdbemanning.ai: ${escapeHtml(opts.subject)}</h2>
    <p style="margin:0 0 16px;color:#555;font-size:13px;">Alert-ID: <code>${escapeHtml(opts.alertId)}</code> · ${new Date().toISOString()}</p>
    <p style="margin:0 0 12px;">${escapeHtml(opts.intro)}</p>
    ${sectionsHtml}
    <h3 style="margin:24px 0 8px;">Klistra in detta i Lovable-chatten för att fixa:</h3>
    <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.5;">${escapeHtml(opts.chatPrompt)}</pre>
    <p style="margin-top:24px;"><a href="${PROJECT_URL}" style="background:#8155FF;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;">Öppna Lovable →</a></p>
    <p style="margin-top:32px;color:#888;font-size:12px;">vårdbemanning.ai health · automatiskt utskick</p>
  </body></html>`;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "vårdbemanning.ai Health <noreply@mail.compcare.se>",
      to: [opts.to ?? ALERT_EMAIL],
      subject: `🚨 ${opts.subject}`,
      html,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, error: `resend ${res.status}: ${txt.slice(0, 200)}` };
  }
  return { ok: true };
}
