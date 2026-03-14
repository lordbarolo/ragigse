import { Share2 } from "lucide-react";

export default function ShareButton({
  title,
  text,
  url,
  className = "",
  label = "Dela med en kollega",
}: {
  title: string;
  text: string;
  url?: string;
  className?: string;
  label?: string;
}) {
  const rawUrl = url || window.location.href;
  const shareUrlObj = new URL(rawUrl);
  shareUrlObj.searchParams.set("utm_source", "referral");
  shareUrlObj.searchParams.set("utm_medium", "share");
  shareUrlObj.searchParams.set("utm_campaign", "colleague_share");
  const shareUrl = shareUrlObj.toString();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      const el = document.createElement("div");
      el.textContent = "Länk kopierad!";
      el.className = "fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-lg text-sm font-medium z-50 animate-fade-in";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm border border-border text-foreground hover:bg-muted transition-all ${className}`}
    >
      <Share2 className="w-4 h-4" />
      {label}
    </button>
  );
}
