import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, isLoading, placeholder }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

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
    <div className="flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-lg">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ställ en fråga om din ersättning…"}
        rows={1}
        disabled={isLoading}
        className="flex-1 bg-transparent text-foreground text-sm resize-none outline-none placeholder:text-muted-foreground/60 px-2 py-1.5 max-h-[120px]"
      />
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
  );
}
