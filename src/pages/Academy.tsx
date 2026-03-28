import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Settings, ClipboardList, PenLine, Pill, TestTube, FileText, Bell, Video, Zap, Key, Lightbulb, AlertTriangle, BookOpen, Search, BarChart3, User, Play, Check, X } from "lucide-react";

interface Module {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
  time: string;
  level: string;
  levelColor: string;
  group: string;
  steps: { title: string; text: string; tip?: string }[];
  keyFacts: string[];
}

const modules: Module[] = [
  {
    id: "settings",
    icon: <Settings className="w-6 h-6" />,
    iconBg: "bg-primary/10 text-primary",
    title: "Personliga inställningar",
    desc: "Anpassa Cosmic till dig",
    time: "5 min",
    level: "Grundnivå",
    levelColor: "bg-primary/10 text-primary",
    group: "Grundläggande",
    steps: [
      { title: "Öppna inställningar", text: "Klicka på kugghjulet uppe till höger i Cosmic. Välj 'Personliga inställningar' i menyn som öppnas." },
      { title: "Välj standardvy", text: "Under 'Standardvyer' väljer du vilken vy som ska öppnas automatiskt när du loggar in. Rekommenderat: Besökslistan.", tip: "Rätt standardvy sparar dig 5–10 klick per inloggning." },
      { title: "Ställ in favoritlistor", text: "Gå till 'Favoritlistor' och lägg till de listor du använder dagligen. Dessa dyker upp direkt i sidopanelen." },
      { title: "Anpassa utskrifter", text: "Under 'Utskriftsmallar' kan du välja vilka mallar som ska visas som förval. Mindre klutter = snabbare arbete." },
    ],
    keyFacts: [
      "Inställningarna följer ditt konto — inte datorn",
      "Ändringarna sparas direkt",
      "Du kan alltid återställa till standardvärden",
    ],
  },
  {
    id: "visits",
    icon: <ClipboardList className="w-6 h-6" />,
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    title: "Besökslistan",
    desc: "Hitta och hantera dagens patienter",
    time: "5 min",
    level: "Grundnivå",
    levelColor: "bg-primary/10 text-primary",
    group: "Grundläggande",
    steps: [
      { title: "Öppna besökslistan", text: "Tryck Ctrl+Alt+B eller navigera via menyn. Besökslistan visar alla dagens inbokade patienter för din enhet.", tip: "Ctrl+Alt+B — lär dig detta kortkommando utantill!" },
      { title: "Filtrera och sortera", text: "Använd filtren högst upp för att visa bara dina egna patienter, eller filtrera på tidblock och besökstyp." },
      { title: "Öppna en patient", text: "Dubbelklicka på patientens rad för att öppna journalen. Patientens senaste anteckningar visas automatiskt." },
      { title: "Statusfärger", text: "Grön = klar, Gul = pågående, Röd = försenad, Grå = ej påbörjad. Håll koll på statusfärgerna för överblick." },
    ],
    keyFacts: [
      "Uppdateras i realtid",
      "Kan sorteras efter tid, namn eller status",
      "Visar direktlänkar till journal och medicinlista",
    ],
  },
  {
    id: "phrases",
    icon: <PenLine className="w-6 h-6" />,
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    title: "Använda fraser",
    desc: "Snabba textförkortningar i journalen",
    time: "3 min",
    level: "Grundnivå",
    levelColor: "bg-primary/10 text-primary",
    group: "Grundläggande",
    steps: [
      { title: "Vad är fraser?", text: "Fraser är korta förkortningar som expanderar till längre text. Skriv t.ex. 'mvh' och tryck Enter → 'Med vänlig hälsning'." },
      { title: "Hitta tillgängliga fraser", text: "Det finns cirka 800 inbyggda fraser. Öppna fraslistan via Verktyg > Fraser för att se alla tillgängliga." },
      { title: "Skapa egna fraser", text: "Under Verktyg > Fraser > Ny fras kan du skapa dina egna. Använd korta, minnesvärda förkortningar." },
    ],
    keyFacts: [
      "~800 inbyggda fraser",
      "Egna fraser kan skapas och delas",
      "Fungerar i alla textfält i Cosmic",
    ],
  },
  {
    id: "prescriptions",
    icon: <Pill className="w-6 h-6" />,
    iconBg: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    title: "Skriva recept",
    desc: "Recept när vårdkontakt saknas",
    time: "5 min",
    level: "Viktigt",
    levelColor: "bg-destructive/10 text-destructive",
    group: "Vanliga arbetsflöden",
    steps: [
      { title: "Öppna receptmodulen", text: "Navigera till Medicinlistan och välj 'Nytt recept'. Om patienten inte har aktiv vårdkontakt, se steg 2." },
      { title: "Välj medicinskt ansvarig enhet", text: "Välj alltid DIN enhet som medicinskt ansvarig. Välj aldrig patientens ursprungsenhet — det är den vanligaste fällan.", tip: "Fel enhet → receptet hamnar i limbo. Dubbelkolla alltid!" },
      { title: "Fyll i receptdetaljer", text: "Sök läkemedel, välj dos och ange ändamål. Cosmic föreslår standarddoser baserat på patientens ålder och vikt." },
      { title: "Signera och skicka", text: "Granska receptet och signera med din HSA-id. Receptet skickas automatiskt till e-Receptregistret." },
    ],
    keyFacts: [
      "Kräver HSA-id för signering",
      "Varningar visas automatiskt vid interaktioner",
      "Receptet syns i e-Hälsomyndigheten inom minuter",
    ],
  },
  {
    id: "lab",
    icon: <TestTube className="w-6 h-6" />,
    iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    title: "Beställa prover",
    desc: "Lab, radiologi och remisser",
    time: "7 min",
    level: "Vanligt",
    levelColor: "bg-secondary text-secondary-foreground",
    group: "Vanliga arbetsflöden",
    steps: [
      { title: "Öppna provbeställning", text: "Gå till patientens journal och välj 'Beställning' > 'Lab'. Du kan även nå det via snabbmenyn med Ctrl+L." },
      { title: "Välj analyser", text: "Sök efter önskade analyser eller använd förinställda paket (t.ex. 'Infektionsstatus'). Markera alla som behövs." },
      { title: "Ange provtagningsdetaljer", text: "Välj provtagningsdatum, fasta-krav och eventuella särskilda instruktioner. Klinisk frågeställning är obligatorisk." },
      { title: "Skicka beställningen", text: "Signera beställningen. Den skickas automatiskt till labbet. Svar kommer tillbaka direkt till Cosmic." },
    ],
    keyFacts: [
      "Provsvar visas under 'Provsvar' i patientens journal",
      "Akuta prover markeras med röd flagga",
      "Historiska provsvar kan jämföras grafiskt",
    ],
  },
  {
    id: "referrals",
    icon: <FileText className="w-6 h-6" />,
    iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    title: "Remisser",
    desc: "Registrera inkommen pappersremiss",
    time: "5 min",
    level: "Vanligt",
    levelColor: "bg-secondary text-secondary-foreground",
    group: "Vanliga arbetsflöden",
    steps: [
      { title: "Öppna remissmodulen", text: "Navigera till 'Remisser' i patientens journal. Välj 'Registrera inkommen remiss'." },
      { title: "Fyll i remissuppgifter", text: "Ange remittent, frågeställning och prioritet. Skanna eller bifoga pappersremissen som bilaga." },
      { title: "Bedöm och vidarebefordra", text: "Gör en medicinsk bedömning av remissen och vidarebefordra till rätt mottagning eller kö." },
    ],
    keyFacts: [
      "Pappersremisser ska alltid digitaliseras",
      "Svarstider varierar per mottagning",
      "Remissvar skickas elektroniskt tillbaka",
    ],
  },
  {
    id: "reminders",
    icon: <Bell className="w-6 h-6" />,
    iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    title: "Reminders",
    desc: "SMS-påminnelser till patienter",
    time: "4 min",
    level: "Nyttigt",
    levelColor: "bg-accent text-accent-foreground",
    group: "Vanliga arbetsflöden",
    steps: [
      { title: "Aktivera påminnelser", text: "Under bokningsflödet kan du aktivera SMS-påminnelse. Patienten får automatiskt ett SMS innan besöket." },
      { title: "Anpassa tidpunkt", text: "Standard är 24 timmar före besöket. Du kan ändra till 48 timmar eller samma dag beroende på besökstyp." },
      { title: "Kontrollera mobilnummer", text: "Verifiera att patientens mobilnummer är korrekt. Utan rätt nummer skickas ingen påminnelse." },
    ],
    keyFacts: [
      "Kräver registrerat mobilnummer",
      "Patienten kan svara för att avboka",
      "Minskar uteblivna besök med ~30%",
    ],
  },
  {
    id: "video",
    icon: <Video className="w-6 h-6" />,
    iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    title: "Videobesök",
    desc: "Digitala patientmöten i Cosmic",
    time: "4 min",
    level: "Modern",
    levelColor: "bg-primary/10 text-primary",
    group: "Vanliga arbetsflöden",
    steps: [
      { title: "Boka videobesök", text: "Skapa en bokning som vanligt men välj besökstyp 'Videobesök'. Patienten får en länk via SMS eller 1177." },
      { title: "Starta mötet", text: "Öppna besöket i Cosmic och klicka 'Starta videosamtal'. Kameran och mikrofonen aktiveras automatiskt." },
      { title: "Dokumentera som vanligt", text: "Journalför under eller efter samtalet precis som vid ett fysiskt besök. Besökstypen registreras automatiskt." },
    ],
    keyFacts: [
      "Fungerar i Chrome och Edge",
      "Patienten behöver ingen app",
      "Journalföring sker som vid fysiskt besök",
    ],
  },
];

const tips = [
  { icon: <Zap className="w-6 h-6 text-warning" />, text: <><strong>Första dagen:</strong> Börja alltid med Personliga inställningar. Rätt vyer sparar dig minuter varje timme.</> },
  { icon: <Key className="w-6 h-6 text-primary" />, text: <><strong>Kortkommando:</strong> Ctrl+Alt+B öppnar Besökslistan direkt — lär dig det utantill.</> },
  { icon: <Lightbulb className="w-6 h-6 text-success" />, text: <><strong>Fraser är guld:</strong> Skriv mvh + Enter → "Med vänlig hälsning". Det finns ~800 förkortningar inbyggda.</> },
  { icon: <AlertTriangle className="w-6 h-6 text-destructive" />, text: <><strong>Recept-fälla:</strong> Välj alltid din enhet som Medicinskt ansvarig — aldrig patientens ursprungsenhet.</> },
];

export default function Academy() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  const progressPct = Math.round((completed.size / modules.length) * 100);

  const toggleComplete = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grouped = modules.reduce<Record<string, Module[]>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero */}
      <section className="hero-gradient px-5 pt-10 pb-12 text-center">
        <div className="text-5xl mb-3">🖥️</div>
        <h1 className="text-2xl font-bold font-display mb-2 text-[hsl(var(--hero-fg))]">
          Cosmic – Snabbintro
        </h1>
        <p className="text-sm opacity-85 max-w-xs mx-auto mb-5 leading-relaxed text-[hsl(var(--hero-fg))]">
          Lär dig de viktigaste funktionerna i Cosmic. Läs eller lyssna — i din takt.
        </p>
        <div className="max-w-[300px] mx-auto">
          <Progress value={progressPct} className="h-2 bg-white/20" />
          <p className="text-xs opacity-80 mt-1.5 text-[hsl(var(--hero-fg))]">
            {completed.size} av {modules.length} moduler klara
          </p>
        </div>
      </section>

      {/* Module list */}
      <div className="max-w-md mx-auto px-4 pt-6">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              {group}
            </h2>
            <div className="flex flex-col gap-2.5">
              {items.map((m) => {
                const done = completed.has(m.id);
                return (
                  <Card
                    key={m.id}
                    className={`flex items-center gap-3.5 p-4 cursor-pointer border-2 transition-all hover:border-primary hover:-translate-y-0.5 ${
                      done ? "border-primary bg-primary/5" : "border-transparent"
                    }`}
                    onClick={() => setActiveModule(m)}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${m.iconBg}`}>
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${m.levelColor}`}>
                          {m.time}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${m.levelColor}`}>
                          {m.level}
                        </span>
                      </div>
                    </div>
                    <span className="text-xl flex-shrink-0">
                      {done ? (
                        <Check className="w-5 h-5 text-primary" />
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-border inline-block" />
                      )}
                    </span>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="max-w-md mx-auto px-4 pb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Snabbtips för konsulter
        </h2>
        <div className="flex flex-col gap-2.5">
          {tips.map((t, i) => (
            <Card key={i} className="flex items-start gap-3 p-3.5">
              <div className="flex-shrink-0 mt-0.5">{t.icon}</div>
              <p className="text-sm leading-relaxed">{t.text}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Module detail modal */}
      <Dialog open={!!activeModule} onOpenChange={(open) => !open && setActiveModule(null)}>
        <DialogContent className="max-w-md p-0 gap-0 max-h-[90vh] overflow-y-auto">
          {activeModule && (
            <>
              {/* Header */}
              <div className="p-5 pb-4 border-b border-border">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-13 h-13 rounded-xl flex items-center justify-center flex-shrink-0 ${activeModule.iconBg}`}>
                    {activeModule.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold font-display leading-tight">
                      {activeModule.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{activeModule.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${activeModule.levelColor}`}>
                    {activeModule.time}
                  </span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${activeModule.levelColor}`}>
                    {activeModule.level}
                  </span>
                </div>
              </div>

              {/* Steps */}
              <div className="p-5 space-y-5">
                {activeModule.steps.map((step, i) => (
                  <div key={i} className="flex gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-1">{step.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                      {step.tip && (
                        <div className="mt-2 bg-warning/10 border-l-[3px] border-warning rounded-r-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-warning">Tips: </strong>{step.tip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Key facts */}
              <div className="mx-5 mb-4 bg-primary/5 rounded-xl p-4">
                <h3 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Viktigt att veta</h3>
                <ul className="space-y-1.5">
                  {activeModule.keyFacts.map((fact, i) => (
                    <li key={i} className="text-xs flex items-baseline gap-2">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 relative top-0.5" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Complete button */}
              <div className="p-5 pt-2">
                <Button
                  className="w-full"
                  variant={completed.has(activeModule.id) ? "secondary" : "default"}
                  size="lg"
                  onClick={() => {
                    toggleComplete(activeModule.id);
                    setActiveModule(null);
                  }}
                >
                  {completed.has(activeModule.id) ? "✓ Redan klar" : "✓ Markera som klar"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
