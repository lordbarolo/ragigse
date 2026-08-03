/**
 * Delade fallback-vyer för startsidan (5c) — visas i stället för vit skärm om
 * loadern kraschar under SSR eller om routen inte matchar.
 */
function Shell({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-5"
      style={{ background: "#0e1016", color: "#eef0f4", fontFamily: "'Space Grotesk',system-ui,sans-serif" }}
    >
      <div className="max-w-md text-center">
        <h1 className="m-0 text-[24px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "#a3a7b7", lineHeight: 1.6 }}>
          {body}
        </p>
        <div className="mt-6 flex justify-center">{action}</div>
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.18)",
  color: "#eef0f4",
};

export function RateDataError({ error }: { error?: Error }) {
  if (error) console.error("[startsida5c]", error);
  return (
    <Shell
      title="Prisdatan kunde inte hämtas"
      body="Ramavtalspriserna är tillfälligt otillgängliga. Försök igen om en liten stund."
      action={
        <button
          onClick={() => window.location.reload()}
          className="rounded-full px-6 py-3 text-sm font-semibold"
          style={buttonStyle}
        >
          Försök igen
        </button>
      }
    />
  );
}

export function RateNotFound() {
  return (
    <Shell
      title="Sidan finns inte"
      body="Adressen leder inte till någon sida. Gå tillbaka till startsidan för att se ramavtalspriserna."
      action={
        <a href="/" className="rounded-full px-6 py-3 text-sm font-semibold" style={buttonStyle}>
          Till startsidan
        </a>
      }
    />
  );
}
