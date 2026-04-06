import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  expanded?: boolean;
}

export default function ChatInput({ onSend, isLoading, placeholder, expanded }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const minHeight = expanded ? 120 : undefined;
  const maxHeight = expanded ? 240 : 120;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const target = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${minHeight ? Math.max(target, minHeight) : target}px`;
  }, [value, minHeight, maxHeight]);

  const handleSubmit = () => {
    if (!value.trim() || isLoading) return;
    onSend(value);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`flex ${expanded ? "flex-1 flex-col" : "items-end"} gap-2 bg-card border border-border rounded-2xl ${expanded ? "p-4" : "p-2"} shadow-lg`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Skriv din fråga här — t.ex. 'Vad är marknadspriset för en sjuksköterska i Zon 2?'"}
        rows={1}
        disabled={isLoading}
        className={`flex-1 bg-transparent text-foreground resize-none outline-none placeholder:text-muted-foreground/50 px-1 py-1 ${expanded ? "text-base leading-relaxed" : "text-sm max-h-[120px]"}`}
      />
      <div className={`flex ${expanded ? "justify-end" : ""}`}>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
