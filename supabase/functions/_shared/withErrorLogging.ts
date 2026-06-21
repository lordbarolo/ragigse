// Shared error-logging wrapper for edge functions.
//
// Wrap your serve handler with `withErrorLogging("function-name", handler)`.
// Any 5xx response or uncaught throw will be logged to public.edge_function_errors
// via the log_edge_error RPC. The cron job `edge-error-monitor` reads that table
// every 15 min and mails if >3 errors in window.
//
// Usage:
//   import { withErrorLogging } from "../_shared/withErrorLogging.ts";
//   Deno.serve(withErrorLogging("save-email", async (req) => { ... }));

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Handler = (req: Request) => Promise<Response> | Response;

export function withErrorLogging(functionName: string, handler: Handler): Handler {
  return async (req: Request) => {
    const requestId = crypto.randomUUID();
    try {
      const res = await handler(req);
      if (res.status >= 500) {
        const body = await res.clone().text().catch(() => "");
        await logError(functionName, `HTTP ${res.status}`, null, { body: body.slice(0, 1000), method: req.method, url: req.url }, requestId);
      }
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack ?? null : null;
      await logError(functionName, message, stack, { method: req.method, url: req.url }, requestId);
      return new Response(
        JSON.stringify({ error: "Internal error", request_id: requestId }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  };
}

async function logError(
  functionName: string,
  message: string,
  stack: string | null,
  context: Record<string, unknown>,
  requestId: string
): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const supabase = createClient(url, key);
    await supabase.rpc("log_edge_error", {
      _function_name: functionName,
      _error_message: message,
      _stack: stack,
      _context: context,
      _request_id: requestId,
    });
  } catch (_e) {
    // never let logging break the response
  }
}
