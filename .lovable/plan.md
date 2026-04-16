

## Fix: Remove metadata role fallback in useAuth.ts

**Problem**: When no `ref_user_roles` row exists, `useAuth.ts` falls back to `user.user_metadata.role`. Since users can update their own metadata via `supabase.auth.updateUser()`, they could self-elevate to `admin` and access admin UI pages.

**Fix**: Remove the metadata fallback. Default to `'individual'` when no DB role is found.

### Change

**File**: `src/hooks/useAuth.ts` (lines 45–53)

Replace the role-fetching logic:
```typescript
// Before (vulnerable)
if (!error && data) {
  setRole(data.role as AppRole);
} else {
  const metaRole = user.user_metadata?.role as AppRole | undefined;
  setRole(metaRole || "individual");
}

// After (safe)
setRole((data?.role as AppRole) ?? "individual");
```

This is a one-line fix. Server-side admin checks (`requireAdmin`) already query the database directly, so this only closes the client-side UI exposure.

