import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitToolSuggestion, TOOL_SUGGESTION_OPTIONS } from "@/lib/toolSuggestions.functions";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VerktygsForslagForm() {
  const submit = useServerFn(submitToolSuggestion);
  const [choice, setChoice] = useState<string>("");
  const [ownText, setOwnText] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsOwnText = choice === "eget";
  const canSubmit =
    !!choice &&
    (!needsOwnText || ownText.trim().length > 2) &&
    EMAIL_REGEX.test(email.trim()) &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await submit({
        data: {
          choice: choice as (typeof TOOL_SUGGESTION_OPTIONS)[number]["value"],
          ownText: needsOwnText ? ownText.trim() : undefined,
          email: email.trim().toLowerCase(),
        },
      });
      setSent(true);
    } catch {
      setError("Kunde inte skicka just nu. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div
        className="mt-6 p-4"
        style={{ background: "#121319", border: "1px solid #22232b", borderRadius: 12 }}
      >
        <p className="m-0 text-[14px] font-semibold" style={{ color: "#ffffff" }}>
          Kolla din inkorg
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "#a1a3ab", lineHeight: 1.6 }}>
          Vi har skickat en bekräftelselänk till {email.trim().toLowerCase()}. Ditt förslag
          registreras när du klickar på länken.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 p-5"
      style={{ background: "#121319", border: "1px solid #22232b", borderRadius: 12 }}
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="text-[14px] font-semibold" style={{ color: "#ffffff" }}>
          Jag vill helst se nya verktyg inom:
        </legend>

        <div className="mt-3 grid gap-2">
          {TOOL_SUGGESTION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2.5 text-[13.5px]"
              style={{ color: "#c7c9cf" }}
            >
              <input
                type="radio"
                name="verktygsforslag"
                value={opt.value}
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
                style={{ accentColor: "#ffffff" }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {needsOwnText && (
        <textarea
          value={ownText}
          onChange={(e) => setOwnText(e.target.value.slice(0, 500))}
          placeholder="Beskriv verktyget du saknar"
          rows={3}
          className="mt-3 w-full p-3 text-[13.5px] outline-none"
          style={{ border: "1px solid #22232b", borderRadius: 10, color: "#ffffff" }}
        />
      )}

      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value.slice(0, 255))}
        placeholder="din@epost.se"
        className="mt-3 w-full p-3 text-[13.5px] outline-none"
        style={{ border: "1px solid #22232b", borderRadius: 10, color: "#ffffff" }}
      />

      <p className="mt-2 text-[11.5px]" style={{ color: "#8a8c94", lineHeight: 1.5 }}>
        Vi skickar en bekräftelselänk till din e-post. Förslaget registreras först när du
        bekräftar adressen.
      </p>

      {error && (
        <p className="mt-2 text-[12px]" style={{ color: "#b4232a" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-3 text-sm font-semibold px-6 py-3"
        style={{
          borderRadius: 999,
          background: canSubmit ? "#121319" : "#c7c9cf",
          color: "#fff",
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {loading ? "Skickar…" : "Skicka förslag"}
      </button>
    </form>
  );
}
