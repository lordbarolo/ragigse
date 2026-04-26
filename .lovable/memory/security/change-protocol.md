---
name: Change Security Protocol
description: Mandatory security analysis after every code change before marking task complete
type: preference
---

After EVERY code change, perform security analysis before marking task done:

1. **Analyze impact** on:
   - RLS policies (new/modified tables)
   - Auth flow (login, signup, role assignment)
   - Edge functions (`requireAdmin`/JWT validation)
   - Public routes (PII leakage)
   - Storage buckets (private/public status)
   - `handle_new_user` trigger (privilege escalation risk)

2. **At any uncertainty**: run `security--run_security_scan` AND `supabase--linter` immediately.

3. **Log findings in chat** before declaring task complete. Use ✅/⚠️/❌ status markers.

**Why:** Traffic is being driven to production. Every change is a potential attack surface change.
**How to apply:** Treat this as a hard gate — never skip, even for "trivial" UI changes that touch data.
