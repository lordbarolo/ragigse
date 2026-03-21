import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage as ChatMessageType } from "@/hooks/useNegotiationChat";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-card border border-border rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm prose-invert max-w-none text-foreground/90 [&_h3]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground [&_ol]:my-1 [&_ul]:my-1">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            {/* Source badges */}
            {message.sources && message.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-border/50">
                {message.sources.map((s, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="text-[10px] font-medium bg-secondary/60 text-muted-foreground"
                  >
                    📊 {s.name} ({s.version})
                  </Badge>
                ))}
                {message.capabilities_used?.map((c, i) => (
                  <Badge
                    key={`cap-${i}`}
                    variant="outline"
                    className="text-[10px] font-medium text-muted-foreground border-border/50"
                  >
                    ⚡ {c}
                  </Badge>
                ))}
              </div>
            )}

            {/* Missing info hint */}
            {message.missing_info && message.missing_info.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-2 italic">
                💡 För bättre råd, ange: {message.missing_info.join(", ")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
