import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const rawUrl = url || window.location.href;
  const shareUrlObj = new URL(rawUrl);
  shareUrlObj.searchParams.set("utm_source", "referral");
  shareUrlObj.searchParams.set("utm_medium", "share");
  shareUrlObj.searchParams.set("utm_campaign", "colleague_share");
  const shareUrl = shareUrlObj.toString();

  const handleShare = async () => {
    // Mobile: use native share (1-tap)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // User cancelled — fallback to copy
        await copyToClipboard();
      }
      return;
    }
    // Desktop: instant copy
    await copyToClipboard();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm border border-border text-foreground hover:bg-muted transition-all active:scale-[0.97] ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-[hsl(var(--green))]" />
          <span className="text-[hsl(var(--green))]">Länk kopierad!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}
