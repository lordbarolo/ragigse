

## Plan: Fix desktop hero layout — cards to the right of text

The hero section already uses `lg:flex-row` to place content side-by-side on desktop, but the cards container (line 250) uses `mx-auto` which centers the cards instead of pushing them to the right.

### Change

**File: `src/pages/demo/LandingV2.tsx` (line 250)**

Update the cards container classes:
- Change `mx-auto` → `mx-auto lg:mx-0 lg:ml-auto` so on desktop the cards align to the right side of the hero
- Optionally add `lg:mr-10` for right padding on desktop

This single-line change restores the side-by-side layout where text is on the left and the flow cards sit to the right on larger screens, while keeping the centered mobile layout intact.

