import { Check, Circle, Shield, Mail, FileCheck, BadgeCheck, AlertCircle } from "lucide-react";

interface TrustItem {
  key: string;
  label: string;
  description: string;
  icon: typeof Shield;
  verified: boolean;
  ctaLabel?: string;
  action?: "upload" | "identity";
}

interface Props {
  emailVerified: boolean;
  identityVerified: boolean;
  hospValid: boolean;
  ivoValid: boolean;
  onUpload?: () => void;
  onVerifyIdentity?: () => void;
}

export default function TrustVerification({
  emailVerified,
  identityVerified,
  hospValid,
  ivoValid,
  onUpload,
  onVerifyIdentity,
}: Props) {
  const items: TrustItem[] = [
    {
      key: "identity",
      label: "Identitet verifierad",
      description: identityVerified ? "Bekräftad via digital signering" : "Verifiera din identitet för att öka förtroendet",
      icon: Shield,
      verified: identityVerified,
      ctaLabel: "Verifiera",
      action: "identity",
    },
    {
      key: "email",
      label: "E-post bekräftad",
      description: emailVerified ? "Din e-postadress är bekräftad" : "Bekräfta din e-postadress",
      icon: Mail,
      verified: emailVerified,
    },
    {
      key: "hosp",
      label: "HOSP-bevis",
      description: hospValid ? "Giltigt HOSP-bevis uppladdat" : "Ladda upp ditt HOSP-bevis",
      icon: BadgeCheck,
      verified: hospValid,
      ctaLabel: "Ladda upp",
      action: "upload",
    },
    {
      key: "ivo",
      label: "IVO-registrering",
      description: ivoValid ? "Verifierad i IVO-registret" : "Bekräfta din IVO-registrering",
      icon: FileCheck,
      verified: ivoValid,
      ctaLabel: "Ladda upp",
      action: "upload",
    },
  ];

  const completedCount = items.filter((i) => i.verified).length;

  const handleAction = (action?: "upload" | "identity") => {
    if (action === "upload") onUpload?.();
    else if (action === "identity") onVerifyIdentity?.();
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">Verifieringar</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {completedCount} av {items.length} klara
        </span>
      </div>

      <ul className="divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex items-center gap-3 px-4 py-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  item.verified ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${item.verified ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>

              {item.verified ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                </div>
              ) : item.ctaLabel && item.action ? (
                <button
                  type="button"
                  onClick={() => handleAction(item.action)}
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  {item.ctaLabel}
                </button>
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
