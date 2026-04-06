

## Plan: Carousel for ServiceCards on mobile

### What changes
Convert the mobile layout of the "Plattformen / Två frågor. Ett svar." section from a vertical stack to a horizontal snap-scroll carousel with dot indicators — matching the pattern already used in `ServiceCarousel.tsx`.

### Single file change: `src/components/landing/ServiceCards.tsx`

1. Add `useState`, `useRef`, `useCallback`, `useEffect` imports from React
2. Add carousel state management (activeIndex, scrollRef, scroll handler, scrollToIndex) — same logic as `ServiceCarousel.tsx`
3. Replace the mobile layout (`flex flex-col`) with a horizontal snap-scroll container (`flex snap-x snap-mandatory overflow-x-auto`) where each card is `snap-center shrink-0 w-full`
4. Add dot indicators below the carousel on mobile (pill-style, animated width)
5. Keep the desktop `sm:grid sm:grid-cols-2` layout unchanged, hidden on mobile via `hidden sm:grid`

No other files need changes.

