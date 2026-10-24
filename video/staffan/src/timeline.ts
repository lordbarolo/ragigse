// Enda sanningskällan för tidslinjen. Allt räknas i takt mot BGM (Cat Walk, 129.99 BPM).
// Video-takt 0 = låtens takt 52 (24.710 s). Drop (takt 64 i låten) = video-takt 12.

export const FPS = 30;
export const DURATION = 600;
export const BPM = 129.99;
export const BEAT_S = 60 / BPM;
export const BGM_OFFSET_S = 24.71;

export const beatF = (n: number) => Math.round(n * BEAT_S * FPS);

const span = (a: number, b: number) => ({ from: a, dur: b - a });

export const SHOTS = {
  hook: span(0, beatF(5)), //        0–69   Krok: "Tänk om konsultchefen jobbade för dig?"
  meet: span(beatF(5), beatF(12)), // 69–166 Möt Staffan + vad agenten vet om dig
  scan: span(beatF(12), beatF(20)), // 166–277 DROP: marknadsskanning, inbromsning på bästa uppdraget
  deal: span(beatF(20), beatF(28)), // 277–388 Agent-till-agent-förhandling, timpris rullar upp
  ops: span(beatF(28), beatF(35)), //  388–485 CV, avtal, referenser, ansökan
  approve: span(beatF(35), beatF(38)), // 485–526 "Du säger bara ja" — godkänn
  outro: span(beatF(38), DURATION), // 526–600 Ordmärke + tagline
};

// Överlapp så att nästa scen kan ta över under utgången.
export const OVERLAP = 10;

// Speaker (ElevenLabs, rösten "Anton", 1.1x). Startframe per replik.
export const VO = [
  { src: 'audio/vo/vo1.wav', from: 2, text: 'Tänk om konsultchefen jobbade för dig?' },
  { src: 'audio/vo/vo2.wav', from: 74, text: 'Möt Staffan – din AI-agent, som vet vad du vill ha.' },
  { src: 'audio/vo/vo3.wav', from: 182, text: 'Staffan skannar hela marknaden och hittar det bästa uppdraget.' },
  { src: 'audio/vo/vo4.wav', from: 286, text: 'Sen förhandlar Staffan direkt med byråns agent – åt dig.' },
  { src: 'audio/vo/vo5.wav', from: 385, text: 'CV, avtal, referenser och ansökan – fixat.' },
  { src: 'audio/vo/vo6.wav', from: 487, text: 'Du säger bara ja.' },
  { src: 'audio/vo/vo7.wav', from: 532, text: 'Staffan. Din agent i vården.' },
];

// AAC-priming i utkodningen ger ~1.3f eftersläpning; dras av centralt (aesthetic-rules S5).
export const AUDIO_OUT_OFFSET = 1;

const S = SHOTS;
// Lokala nyckelframes som scenerna och ljudet delar.
export const K = {
  hookMarker: 42,
  meetChips: [30, 37, 43, 48, 52, 55],
  meetSuck: 82,
  scanBrake: 69,
  scanLift: 73,
  dealMsgs: [6, 23, 40, 56],
  dealDone: 68,
  opsCues: [6, 18, 28, 36],
  opsFixat: 69,
  approveTap: 20,
  outroLetters: 14,
};

type Sfx = { from: number; src: string; volume: number; dur?: number; note: string };

// SFX-spikning: alltid relativa uttryck (shot.from + lokal frame).
export const SFX: Sfx[] = [
  { from: S.hook.from + K.hookMarker, src: 'marker-pen-line', volume: 0.55, dur: 16, note: 'markeringsstreck under "dig"' },
  { from: S.meet.from + 2, src: 'light-aura', volume: 0.32, dur: 50, note: 'orben tänds' },
  ...K.meetChips.map((c, i) => ({
    from: S.meet.from + c,
    src: i % 2 ? 'switch-tap' : 'pop',
    volume: 0.42 - i * 0.03,
    dur: 14,
    note: `chip ${i + 1} poppar in`,
  })),
  { from: S.meet.from + K.meetSuck, src: 'air-zoom-vacuum', volume: 0.5, note: 'chips sugs in i orben' },
  { from: S.scan.from, src: 'bass-hit-futuristic', volume: 0.6, note: 'DROP — orben spricker till chockring (slam 1/3)' },
  { from: S.scan.from + 2, src: 'sweep-scifi-fast', volume: 0.55, note: 'listan rusar förbi' },
  { from: S.scan.from + K.scanBrake - 2, src: 'impact-zoom-quick', volume: 0.5, note: 'inbromsning' },
  { from: S.scan.from + K.scanLift, src: 'camera-autofocus', volume: 0.35, dur: 14, note: 'målrad låses' },
  { from: S.scan.from + 99, src: 'swoosh-quick', volume: 0.4, note: 'målraden flyger upp till headern' },
  ...K.dealMsgs.map((m, i) => ({
    from: S.deal.from + m,
    src: i % 2 ? 'typewriter-hit-hard' : 'typewriter-hit-soft',
    volume: 0.4,
    dur: 16,
    note: `förhandlingsbubbla ${i + 1}`,
  })),
  { from: S.deal.from + K.dealDone, src: 'lock-quick', volume: 0.55, note: 'överens — pris låst' },
  { from: S.deal.from + K.dealDone + 2, src: 'sparkle-touch', volume: 0.3, dur: 40, note: 'överens-glans' },
  { from: S.ops.from, src: 'whoosh-fast', volume: 0.4, note: 'in i pappersjobbet' },
  ...K.opsCues.map((c, i) => ({
    from: S.ops.from + c + 12,
    src: i % 2 ? 'paper-move-quick' : 'paper-slide',
    volume: 0.45 - i * 0.05,
    dur: 16,
    note: `rad ${i + 1} landar`,
  })),
  ...K.opsCues.map((c, i) => ({
    from: S.ops.from + c + 20,
    src: 'switch-click-quick',
    volume: 0.3 - i * 0.03,
    dur: 10,
    note: `bock ${i + 1}`,
  })),
  { from: S.ops.from + K.opsFixat, src: 'hit-weak', volume: 0.6, note: '"Fixat." stämplas' },
  { from: S.ops.from + K.opsFixat + 8, src: 'marker-pen-line', volume: 0.45, dur: 14, note: 'understrykning "Fixat."' },
  { from: S.approve.from, src: 'wind-swoosh-short', volume: 0.4, note: 'godkännandekortet glider upp' },
  { from: S.approve.from + K.approveTap, src: 'switch-click-quick', volume: 0.65, note: 'tummen trycker Godkänn' },
  { from: S.approve.from + K.approveTap + 1, src: 'sparkle-touch', volume: 0.3, dur: 30, note: 'signerat' },
  { from: S.outro.from - 18, src: 'riser-cine', volume: 0.2, dur: 32, note: 'kort riser in i ordmärket' },
  { from: S.outro.from + 2, src: 'air-zoom-vacuum', volume: 0.26, note: 'kortet krymper till orb' },
  { from: S.outro.from + K.outroLetters, src: 'impact-deep-whoosh', volume: 0.5, note: 'ordmärket landar (slam 3/3, toppvolym)' },
  { from: S.outro.from + K.outroLetters + 10, src: 'shimmer-sparkle-sweep', volume: 0.28, dur: 50, note: 'efterglans' },
];
