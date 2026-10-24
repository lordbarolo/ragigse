# Staffan 20 s – independent final review

Inputs: `out/staffan-promo.mp4`, `out/staffan-promo-nobgm.mp4`, keyframes in `out/qa/final/`, extra frames pulled with ffmpeg, `SPEC.md`, `src/`, final-review.md and aesthetic-rules.md, demo TSX for the odometer card.
Tech: 1080×1920, 30 fps, 600 frames, AAC 48 kHz stereo. Both files have identical structure.

## Findings, worst first

### Must fix
- **D1/B2 ✗ (frames 130, 250, 290–388, 495–526): the weeks contradict each other.** The consultant chip says `LEDIG v. 12–20` (f130). The "98 % best match" is `Sundsvall · v. 27–35` (f250, and it stays as the header through f388). The approval card then says `IVA · Sundsvall · v. 12–20` (f495–524). So the match falls outside the consultant's availability, and the job changes weeks between the deal and the signing. A viewer who reads the screen will see that the agent "doesn't know your needs". That undermines feature (1) and the whole promise. The decoy row `Distriktssköterska · VC, Gävle · v. 12–20` (f200/250) makes it worse.
- **A3 ✗ (frames 147 vs 166, all cuts): the music does not match the beat grid.** I measured the BGM residual (with-BGM minus no-BGM, I = −22.1 LUFS, the same as a reference BGM rendering). The song's break is at f135–138 and the music comes back in at **about f146–147**. After that the kicks land at about f147 / 161 / 175 / 189 (period 13.8 f). The visual DROP (shock ring + bass-hit) is at **f166**, 19 f (0.63 s) after the musical re-entry. It falls between two kicks. Every cut on `beatF()` (69, 166, 277, 388, 485, 526, slam 540) sits about 4–5 f after the nearest kick (onset −3.9 f, peak −2.7 f, 50 ms profile −5 f). That is above the A3 tolerance of 3 f and always in the same direction. The spec goal "drop lands on video beat 12 (f166)" is not met.

### Should fix
- **A2/VO ✗ (frames 140–180): the end of VO2 is masked by the drop.** VO2 runs f74→f180 and crosses the drop at f166. In 5.53–6.0 s the VO tail RMS is −17.6 dB, while the no-BGM mix measures −15.3 dB and the full mix −14.2 dB. So "…vill ha" sits at roughly 0 dB SNR against bass-hit + sweep (+ music in the full version). The chips are also sucked into the orb at f151, while the VO is still describing what Staffan knows.
- **S3/Q ✗ (frames 281–301, 345–382): the odometer.**
  - f281–283 reads `000 kr/h`. Through f300 the reels pass nonsense values (300, 600, 830, 000, 290, 439, 552, 664…) while the bubble says 790.
  - The half-row overshoot shows mixed readings (`790/801` f296–301, `865/875` f364).
  - The ROWH/FS ratio is 1.06, against 1.105 in the demo, so moving digits get their tops cropped (f290, f330).
  - The stagger is 2 f against 7 f in the demo, and the overshoot return is 5 f against 6 f.
  - The `✓ Överens` label, the mint colour and `lock-quick` all fire at f345, but the number only settles at f366.
  - The final price 865 kr/h stands still for only about 16 f (f366→382) before the blur-out. R1 asks for ≥ 1 s on key information.
- **Q (safe zone) ✗ (frames 250, 330–375, 440–475): content under the right-hand rail.** On TikTok/Reels the icons sit at x ≈ 960–1060, y ≈ 830–1550. Items in that area:
  - the check marks (x 915–980, y 610–1260), which are the "done" signal of the paperwork scene;
  - the 98 % badge (x 885–1000, y 1005–1065);
  - Staffan's bubbles, which reach x 1019.
  
  Separately, the `+75 kr/h mot första budet` pill sits at y 1535–1600, past the spec's own limit of 1560 and into the caption zone.
- **Q11 ✗ (frame 598): the CTA is the smallest line in the outro.** `Väntelistan är öppen →` is 32 px mono, against a 54/64 px tagline. The rule says the CTA must never be the smallest line. It also has no destination (no link, handle or "länk i bio").

### Minor
- **Q ✗ (frames 245–262, f250): label overlaps a row.** The `BÄSTA MATCHNINGEN` label sits on top of the subtitle of the dimmed row above (`Luleå · v. 22–30 · Heltid`).
- **P3 ~ (frames 130 vs 250): match below the price floor.** A 98 % match is listed at 790 kr/h, under `LÄGSTA PRIS 850 kr/h`. The final 865 rescues the story, but a viewer may read 98 % as an error.
- **Q ~ (frames 505–514): the thumb hides the confirmation.** The white thumb disc covers "…erat" in `✓ Signerat` for about 8 f.
- **C ~ (VO2, copy): comma in VO2.** `din AI-agent, som vet vad du vill ha`: the comma is grammatical (non-restrictive clause), but it gives the TTS a pause. Without the comma it is tighter.

### Passes
- **P1 ✓** Positioning is clear: hook "Tänk om konsultchefen jobbade för *dig?*" (f045), then "Din AI-agent på vårdbemanningsmarknaden" (f130), then "Din agent i vården" (f598).
- **F1 ✓** All 8 features are visible and understandable:
  1. needs/skills (chips, f130)
  2. scanning/matching (1 284 → 98 %, f250)
  3. agent-to-agent negotiation (f375)
  4. CV (f440–475)
  5. contract review (f440–475)
  6. references (f440–475)
  7. application (f440–475)
  8. one-tap approval (f505–524)
- **F2 ✓** Each shot adds new information. The two taglines (f130/f598) are close to each other but acceptable.
- **B1 ✓** Shot order and lengths follow the storyboard: 0/69/166/277/388/485/526. Key frames match: marker f42, brake f235, lift f239, "Fixat." f457, tap f505, wordmark f540.
- **B3/R1 ✓** The wordmark is complete from about f552 and the full lockup (with CTA) from about f568, held to f600: 1.6 s / 1.07 s. The four checked rows stand still for about 1.2 s.
- **R2 ✓** Rows arrive faster and faster (gaps 12 → 10 → 8 f). The scan uses an out-expo brake.
- **R4 ✓** There are at most 3 full-frame hits (f166; f513 is element-level only; f540). No camera jitter (Q3 ✓).
- **S1 ✓** Every shot card in the spec appears in its shot: blur-slide, marker-underline, chip breathing, scroll-brake, odometer, row-embed, pop-burst (ring + 10 rays), logo-shrink lockup.
- **V1–V4 ✓** The palette, typography and glass cards follow "Nordic Night". Mint/amber are used consistently for Staffan vs. the agency.
- **C ✓** Swedish on screen and in the VO is correct and natural. Strings checked:
  - "Pappersjobbet?", "Uppsägningstid 3 → 1 mån, omförhandlad", "2 av 2 har bekräftat", "Mottagen av byrån 07:42"
  - "865 + resor, så är vi överens.", "Ditt nya uppdrag är klart att signera."
  - "uppdrag analyserade", "Norrland funkar"
  
  I found no spelling errors.
- **D2/D5 ✓** Everything is fictional. There are no companies, people or agency names. Real place names are used only generically.
- **A loudness ✓** With BGM: −14.7 LUFS, TP −1.1 dBTP. Without BGM: −15.5 LUFS, TP −2.2 dBTP.
- **A ending ✓** The VO ends at about 19.85 s and the audio fades out (−48 dB in the last 50 ms). Nothing is cut off.
- **A1 ✓** The BGM sits about 7 LU under the mix, and the VO is clearly on top outside the drop.
- **A2 ✓** The other SFX hit their keyframes: typing per bubble, paper/tick per row, hit-weak on "Fixat.", click on the tap, impact on the wordmark.
- **A8 ✓** The two versions differ only in the BGM. Picture PSNR is 62 dB on average (min 48, i.e. only encoder noise). The audio residual has the same loudness as the reference BGM (−22.1 LUFS).

### Could not verify
- The Gallery reference videos and the `library.json` style keys were not part of the inputs.
- I did not test audibility (A6) one SFX at a time.
- I could not verify the music licence.

## Fixes that matter
1. **Weeks:** set the target job to `v. 12–20` in `Scan.tsx` (`wk` for `TARGET`). Give the Gävle row other weeks. Leave `Approve.tsx` as it is (12–20).
2. **Beat grid:** move `BGM_OFFSET_S` from 24.71 to about **24.08** (−0.63 s). That lands the musical re-entry on f166 and also corrects the kick phase (4–5 f late). Then measure the residual again (kick onset within ±2 f of `beatF`).
3. **VO2:** shorten it so it ends before f160 (e.g. "Möt Staffan – din AI-agent."). Alternatively, duck `bass-hit-futuristic`/`sweep-scifi-fast` by about 6 dB while the VO is speaking.
4. **Odometer:**
   - Start the roll near the value (e.g. from 7xx with few rows) or show 790 static. Use ROWH ≈ 1.1×FS.
   - Move the `Överens` label, the mint colour and `lock-quick` to the lock frame (about local frame 89).
   - Give the final price ≥ 1 s of hold, e.g. by taking time from the bubbles or delaying the deal fade-out.
5. **Right column:** keep the key UI inside x ≤ 940 between y 800–1550 (check marks, 98 % badge, bubbles). Raise the `+75` pill above y 1560.
6. **CTA:** raise it to ≥ 40–44 px and add a destination (e.g. "Länk i bio").
