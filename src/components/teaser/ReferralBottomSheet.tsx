import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, Users } from "lucide-react";
import ReferralDialog from "./ReferralDialog";

interface Props {
  ctaRef: React.RefObject<HTMLElement | null>;
  leadId: string;
  referrerEmail: string;
  region?: string;
  onCheckout: (plan: "single") => void;
  priceKr?: number;
}

export default function ReferralBottomSheet({ ctaRef, leadId, referrerEmail, region, onCheckout, priceKr = 49 }: Props) {
  const [visible, setVisible] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;

    const key = "referralSheetShown";
    if (sessionStorage.getItem(key)) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (shownRef.current || !ctaRef.current) return;

      const rect = ctaRef.current.getBoundingClientRect();
      // Button is above the viewport (user scrolled past it)
      if (rect.bottom < 0) {
        timeout = setTimeout(() => {
          if (!shownRef.current) {
            shownRef.current = true;
            sessionStorage.setItem(key, "1");
            setVisible(true);
          }
        }, 1500);

        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, [ctaRef]);

  const handleNoThanks = () => {
    setVisible(false);
    ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      <Sheet open={visible} onOpenChange={setVisible}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6 max-w-lg mx-auto [&>button:last-child]:hidden">
          <button
            onClick={() => setVisible(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Stäng"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">
              Hur ligger dina kollegor till?
            </h3>
            <p className="text-sm text-muted-foreground">
              Skicka analysen till en kollega — hen får en egen ersättningskoll, och du låser upp din rapport gratis.
            </p>

            <Button
              onClick={() => {
                setVisible(false);
                setReferralOpen(true);
              }}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Tipsa en kollega
            </Button>

            <button
              onClick={handleNoThanks}
              className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Nej tack, jag betalar {priceKr} kr
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ReferralDialog
        open={referralOpen}
        onOpenChange={setReferralOpen}
        leadId={leadId}
        referrerEmail={referrerEmail}
        region={region}
      />
    </>
  );
}
