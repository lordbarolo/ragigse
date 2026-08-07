/**
 * Översätter felmeddelanden från autentiseringstjänsten till svenska.
 * Alla felmeddelanden som visas för användaren ska passera här.
 */

const RULES: Array<{ test: RegExp; message: string }> = [
  { test: /password.*(too short|at least|minimum)|minimum length|password should be at least/i, message: "Lösenordet är för kort. Använd minst 6 tecken." },
  { test: /password.*(weak|strength)|weak_password|does not meet/i, message: "Lösenordet är för svagt. Använd minst 6 tecken och blanda bokstäver, siffror och tecken." },
  { test: /pwned|known to be weak|data breach|compromised/i, message: "Lösenordet förekommer i kända dataläckor. Välj ett annat lösenord." },
  { test: /invalid login credentials/i, message: "Fel e-post eller lösenord." },
  { test: /email not confirmed/i, message: "E-postadressen är inte bekräftad. Klicka på länken i mejlet vi skickade." },
  { test: /already registered|already been registered|user already/i, message: "Det finns redan ett konto med den e-postadressen." },
  { test: /invalid email|unable to validate email/i, message: "E-postadressen ser inte giltig ut." },
  { test: /same as the old password|should be different/i, message: "Det nya lösenordet måste skilja sig från det gamla." },
  { test: /rate limit|too many requests|over_email_send_rate/i, message: "För många försök. Vänta en stund och försök igen." },
  { test: /token.*(expired|invalid)|invalid.*token|otp_expired/i, message: "Länken är ogiltig eller har gått ut. Begär en ny." },
  { test: /user not found/i, message: "Vi hittade inget konto med de uppgifterna." },
  { test: /network|fetch failed|failed to fetch/i, message: "Nätverksfel. Kontrollera din anslutning och försök igen." },
  { test: /popup|window closed/i, message: "Inloggningsfönstret stängdes innan du blev inloggad." },
  { test: /unsupported provider|provider is not enabled/i, message: "Inloggningsmetoden är inte tillgänglig just nu." },
];

export function translateAuthError(error?: { message?: string } | string | null): string {
  const raw = typeof error === "string" ? error : error?.message;
  if (!raw) return "Något gick fel. Försök igen.";
  const match = RULES.find((rule) => rule.test.test(raw));
  if (match) return match.message;
  // Okänt fel från tjänsten (engelsk text) – visa ett neutralt svenskt meddelande.
  return "Något gick fel. Försök igen.";
}
