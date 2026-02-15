import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  streamingText: string;
}

export default function ChatView({ messages, onSendMessage, isLoading, streamingText }: ChatViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !streamingText && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-[family-name:var(--font-display)] text-[var(--amber)]">
                Glintlock
              </h2>
              <p className="text-[var(--text-secondary)] text-sm max-w-md">
                Your solo TTRPG campaign awaits. Send a message to begin — or use a
                slash command like <code className="text-[var(--amber)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded text-xs">/play</code> to
                start a session.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streamingText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--amber-dim)] flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--amber)] text-xs font-bold">GM</span>
            </div>
            <div className="flex-1 bg-[var(--bg-card)] rounded-lg px-4 py-3 text-sm text-[var(--text)] whitespace-pre-wrap">
              {streamingText}
              <span className="inline-block w-1.5 h-4 bg-[var(--amber)] ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--amber-dim)] flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--amber)] text-xs font-bold">GM</span>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--text-dim)] animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-[var(--text-dim)] animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-[var(--text-dim)] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--border)] px-6 py-3">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you do?"
            rows={1}
            className="flex-1 bg-[var(--bg-input)] text-[var(--text)] placeholder-[var(--text-dim)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[var(--amber)] transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-[var(--amber)] text-[var(--bg-app)] font-semibold text-sm rounded-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? "bg-[var(--blue-dim)]"
            : "bg-[var(--amber-dim)]"
        }`}
      >
        <span className={`text-xs font-bold ${isUser ? "text-[var(--blue)]" : "text-[var(--amber)]"}`}>
          {isUser ? "You" : "GM"}
        </span>
      </div>
      <div
        className={`flex-1 rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-[var(--blue-dim)] text-[var(--text)] max-w-[70%] ml-auto"
            : "bg-[var(--bg-card)] text-[var(--text)]"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
