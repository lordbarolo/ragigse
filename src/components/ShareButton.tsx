import { Share2 } from "lucide-react";

/**
 * Share button using Web Share API on mobile,
 * fallback to clipboard copy on desktop.
 */
export default function ShareButton({
  title,
  text,
  url,
  className = "",
}: {
  title: string;
  text: string;
  url?: string;
  className?: string;
}) {
  const shareUrl = url || window.location.href;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // User cancelled — ignore
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      // Simple fallback notification
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
      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border border-border text-foreground hover:bg-muted/50 transition-all ${className}`}
    >
      <Share2 className="w-4 h-4" />
      Dela med en kollega
    </button>
  );
}
