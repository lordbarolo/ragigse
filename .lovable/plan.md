

## Problem

Step 2 ("Välj din roll") currently has a title and a single dropdown inside a small card. On a full-height mobile screen this leaves the dropdown floating in the vertical center with lots of empty space. The user wants the dropdown pushed lower and the page to feel more filled out.

## Changes in `src/components/Survey.tsx`

**Step 2 block (lines 489–505):** Restructure the layout to:

1. Add a contextual subtitle under the title explaining what step 2 does (e.g., "Vi behöver veta din specialisering för att hitta rätt avtalspriser.")
2. Add an icon/illustration area above the card (the Stethoscope icon, large and muted) to fill vertical space in the upper portion
3. Push the dropdown card toward the bottom of the available space using `justify-end` instead of the current `justify-center` from StepWrapper
4. Override StepWrapper's vertical centering for step 2 specifically by wrapping content in a flex container with `mt-auto` so the card sits in the lower portion

Concrete layout for step 2 content:

```
[Title: "Välj din roll"]
[Subtitle: "Vi behöver veta din specialisering för att matcha rätt avtalspriser."]

        (spacer / flex-grow)

[Large muted icon — Stethoscope or Briefcase depending on category]
[Short helper text: "Vald kategori: Läkare" chip]

        (spacer)

[Dropdown card — pushed to lower half]
```

This keeps the dropdown in the lower ~40% of the screen (easy thumb reach on mobile) while the upper area has meaningful content.

## Files modified

- `src/components/Survey.tsx` — step 2 section only (lines 488–506)

