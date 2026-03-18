import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { ProfileStatusResult } from "@/types/referly";
import { VerificationUpload } from "./VerificationUpload";

interface ProfileStatusCardProps {
  data: ProfileStatusResult;
  onRefresh: () => void;
  onInvite?: () => void;
  onVerifyBankId?: () => void;
}

const STATUS_CONFIG = {
  complete: {
    label: "Profil verifierad",
    sublabel: "Din profil är komplett och redo att delas",
    bgClass: "bg-primary",
    textClass: "text-primary-foreground",
    sublabelClass: "text-primary-foreground/70",
    iconBgClass: "bg-primary-foreground/20",
    borderClass: "",
  },
  almost: {
    label: "Slutför din profil",
    sublabel: "Ett steg kvar till komplett profil",
    bgClass: "bg-card",
    textClass: "text-foreground",
    sublabelClass: "text-muted-foreground",
    iconBgClass: "bg-primary/10",
    borderClass: "border border-primary/20",
  },
  incomplete: {
    label: "Kom igång",
    sublabel: "Lägg till dina uppgifter för att aktivera profilen",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
    sublabelClass: "text-muted-foreground",
    iconBgClass: "bg-muted-foreground/10",
    borderClass: "border border-border",
  },
};

function CheckDot({ done }: { done: boolean }) {
  if (done) {
    return (
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  return <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (status === "almost") {
    return (
      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function ProfileStatusCard({ data, onRefresh, onInvite, onVerifyBankId }: ProfileStatusCardProps) {
  const config = STATUS_CONFIG[data.status];
  const cl = data.checklist;

  const ivoOk = cl.ivo.done;
  const hospOk = cl.hosp.done;
  const bothOk = ivoOk && hospOk;
  const complianceSummary = bothOk ? "IVO & HOSP OK" : ivoOk ? "IVO OK · HOSP saknas" : hospOk ? "IVO saknas · HOSP OK" : "Ej kontrollerade";

  return (
    <div className="space-y-2.5">
      <div className={`rounded-xl p-4 ${config.bgClass} ${config.textClass} ${config.borderClass}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${config.iconBgClass} flex items-center justify-center`}>
            <StatusIcon status={data.status} />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{config.label}</h3>
            <p className={`text-xs ${config.sublabelClass}`}>{config.sublabel}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border divide-y divide-border/50">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <CheckDot done={cl.references.done} />
          <span className={`flex-1 text-xs ${cl.references.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {cl.references.count ?? 0} av {cl.references.required ?? 2} kvalificerade referenser
          </span>
          {!cl.references.done && onInvite && (
            <button onClick={onInvite} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Bjud in →</button>
          )}
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3">
          <CheckDot done={cl.bankid.done} />
          <span className={`flex-1 text-xs ${cl.bankid.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>BankID-verifiering</span>
          {!cl.bankid.done && onVerifyBankId && (
            <button onClick={onVerifyBankId} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">Verifiera →</button>
          )}
        </div>
      </div>

      <Collapsible>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <CheckDot done={bothOk} />
              <div className="text-left">
                <span className="text-xs font-medium text-foreground">Myndighetskontroll</span>
                <span className={`text-[10px] ml-1.5 ${bothOk ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{complianceSummary}</span>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-2">
              <div className={`flex items-center justify-between p-2.5 rounded-lg ${ivoOk ? "bg-muted/50" : "bg-muted/30"}`}>
                <div className="flex items-center gap-2.5">
                  <CheckDot done={ivoOk} />
                  <div>
                    <span className={`text-xs ${ivoOk ? "text-foreground font-medium" : "text-muted-foreground"}`}>IVO Tillsyn</span>
                    {ivoOk && cl.ivo.validUntil && <p className="text-[10px] text-muted-foreground">Giltig t.o.m. {cl.ivo.validUntil}</p>}
                  </div>
                </div>
                {!ivoOk && <VerificationUpload type="ivo" label="IVO" onSuccess={onRefresh} />}
              </div>
              <div className={`flex items-center justify-between p-2.5 rounded-lg ${hospOk ? "bg-muted/50" : "bg-muted/30"}`}>
                <div className="flex items-center gap-2.5">
                  <CheckDot done={hospOk} />
                  <div>
                    <span className={`text-xs ${hospOk ? "text-foreground font-medium" : "text-muted-foreground"}`}>HOSP</span>
                    {hospOk && cl.hosp.validUntil && <p className="text-[10px] text-muted-foreground">Giltig t.o.m. {cl.hosp.validUntil}</p>}
                  </div>
                </div>
                {!hospOk && <VerificationUpload type="hosp" label="HOSP" onSuccess={onRefresh} />}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
