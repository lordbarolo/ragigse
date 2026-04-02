

## Problem
The "Verifikationer — kommer snart" badge is centered vertically within the ComingSoonOverlay, but on mobile the content is tall, pushing the badge off-screen (user has to scroll to see it).

There's also a build error that needs fixing — the previous edit to remove "Skapa konto" from Index.tsx nav was planned but not applied; the build error likely stems from something else.

## Changes

### 1. Fix ComingSoonOverlay positioning
**File: `src/components/ComingSoonOverlay.tsx`**

Change the overlay from vertically centered (`items-center`) to top-aligned with padding, so the badge appears near the top of the section where the user lands.

```tsx
// Line 14: change items-center to items-start with pt-32
<div className="absolute inset-0 flex items-start justify-center pt-32">
```

### 2. Remove "Skapa konto" button from Index.tsx nav (previous approved change)
**File: `src/pages/Index.tsx` (lines 83-85)**

Remove the `<Link to="/registrera"><Button>Skapa konto</Button></Link>` block.

### 3. Investigate build error
The build error may be from an incomplete prior edit. Will check and fix during implementation.

