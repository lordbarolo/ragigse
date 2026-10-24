# Staffan — reklamfilm 20 s (design-spec)

Läge: **autonom fri kreation** (video-shotcraft pipeline), från en enda prompt.

## Produktbrief
- **Produkt:** Staffan — AI-agent för konsulter inom svensk vårdbemanning. Ersätter konsultchefen: konsultens agent pratar med byråns agent (eller människa) för att hitta marknadens bästa uppdrag utifrån konsultens krav, önskemål och kompetens.
- **Funktioner som måste synas:** (1) kännedom om konsultens krav/kompetens, (2) marknadsskanning/matchning, (3) agent-till-agent-förhandling, (4) CV-optimering, (5) avtalskontroll, (6) referenser, (7) ansökningshandlingar, (8) konsulten godkänner med ett tryck.
- **Kanal:** sociala medier (Reels/TikTok/LinkedIn mobil). **Format:** 1080×1920, 30 fps, 600 frames = 20,0 s. **Språk:** svenska.
- **Data:** allt fiktivt (orter, timpriser, matchningsgrader, klockslag). Inga verkliga bolag, personer eller byråer.
- Ingen befintlig Staffan-UI finns → handbyggd UI (icke-replikering, aesthetic-rules Q1).

## Beslutstabell (krav → genomförande)
| Krav | Beslut |
|---|---|
| 20 s, sociala medier | 9:16, krok inom 1 s, text inom säker zon y 220–1560 |
| "Helt färdig modern produkt" | Mörk premium-UI, glas-kort, agent-orb, 2.5D-rörelser, takt-synkad klippning |
| "Valfria connectors" | ElevenLabs: svensk speaker (röst *Anton*, eleven_v4), 1 tagning (348 krediter) |
| Ljud | BGM *Cat Walk* (Arulo, Mixkit fri licens), 129,99 BPM, start i låtens takt 52 så att droppet landar på video-takt 12 (f166) |
| Leverans | Med BGM + utan BGM (speaker + SFX kvar), samma tidslinje via `bgm`-prop |

## Visuell riktning — "Nordic Night"
- Bakgrund bläck `#06070B`, text varmvit `#F3EFE7`, signalfärg mint `#5CF2C4` = Staffan, bärnsten `#FFB867` = byråns agent.
- Typsnitt: Instrument Serif (rubriker, kursiv för betoning), Inter (UI), JetBrains Mono (agentprotokoll/etiketter).
- Rörelsetokens: professionell/tillitsfull bas (~18–21f, out-cubic/out-expo), översläng endast vid landning (outBack 1.4–2.4). Max 3 helbildsslag: f166 (drop), f513 (signering, element-nivå), f540 (ordmärke).
- Styleframe hoppad över: ingen befintlig produktvisuell att förhålla sig till; riktningen verifierades direkt med stillbilder (`out/qa/`).

## Funktion → shotkort
| Funktion | Kort (demo) |
|---|---|
| Krok-rubriker | `blur-slide` (BlurSlide.tsx) + `marker-underline-title` |
| Agentens kunskap | `morph-from-primitive`-andning på orben + chips (egen) |
| Marknadsskanning | `scroll-brake-moves` · A changelog-scroll-brake |
| Förhandling | `odometer-digit-roll` (anpassad till stegvisa värden) |
| CV/avtal/referenser/ansökan | `row-embed` + mini `pop-burst-confirm` |
| Godkänn | `pop-burst-confirm` (ring + 10 strålar) |
| Outro | `logo-shrink-wordmark-lockup` |

## Storyboard (frames)
| # | Tid | Scen | Huvudrörelse | Speaker |
|---|---|---|---|---|
| S1 | 0–69 | "Tänk om konsultchefen jobbade för *dig?*" | blur-slide ord för ord, markerstreck f42 | vo1 |
| S2 | 69–166 | "Möt *Staffan.*" + 6 chips (roll, erfarenhet, lägsta pris, ort, krav, ledighet) | orb växer, chips poppar accelererande, sugs in i orben | vo2 |
| S3 | 166–277 | DROP → "Skannar marknaden · 1 284 uppdrag" | chockring, lista rusar, out-expo-broms f235, målrad 98 % lyfts, flyger upp som header | vo3 |
| S4 | 277–388 | Byråns agent ↔ Staffan, timpris 790 → 840 → 865 kr/h | bubblor på takt, odometer, "✓ Överens · +75 kr/h" f345 | vo4 |
| S5 | 388–485 | "Pappersjobbet?" CV/Avtal/Referenser/Ansökan → "*Fixat.*" | row-embed accelererande, bockar, stämpel f457 | vo5 |
| S6 | 485–526 | "Du säger bara *ja.*" — kort "Godkänn" | kort glider upp, tumme trycker f505 → "✓ Signerat" | vo6 |
| S7 | 526–600 | Orb + "Staffan" · "Din agent i *vården.*" · "Väntelistan är öppen →" | kort kollapsar till orb, lockup, slag f540, håll ≥1 s | vo7 |

## Medvetna avvikelser
- Format 9:16 i stället för pipelinens 16:9 (sociala medier). Q11-teckenhöjder tolkade för mobil helskärm: rubriker 128–156 px, UI 36–50 px, etiketter 22–30 px (sekundära).
- Workbench-manifest (`src/workbench.ts`) ej skrivet: molnsessionen kan inte exponera localhost till användaren.
