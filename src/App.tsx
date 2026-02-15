import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { initClient, createSession, sendMessage } from "./lib/opencode";
import ChatView from "./components/ChatView";

type View = "play" | "character" | "gm" | "story" | "settings";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: "play", label: "Play", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" },
  { id: "character", label: "Character", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "gm", label: "GM Screen", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "story", label: "Story", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function App() {
  const [activeView, setActiveView] = useState<View>("play");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);

  // Initialize OpenCode connection
  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const port = await invoke<number>("get_opencode_port");
        initClient(port);

        // Wait for OpenCode server to be ready (may take a few seconds to start)
        let retries = 0;
        while (retries < 30 && !cancelled) {
          try {
            const session = await createSession("Glintlock Session");
            if (!cancelled) {
              setSessionId(session.id);
              setConnectionStatus("connected");
            }
            return;
          } catch {
            retries++;
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
        if (!cancelled) {
          setConnectionStatus("error");
          setError("Could not connect to OpenCode server after 30s");
        }
      } catch (e) {
        if (!cancelled) {
          setConnectionStatus("error");
          setError(String(e));
        }
      }
    }

    connect();
    return () => { cancelled = true; };
  }, []);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!sessionId) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setStreamingText("");

      try {
        const response = await sendMessage(sessionId, text, (event) => {
          // Handle SSE streaming events
          const evt = event as { data?: string };
          if (evt.data) {
            try {
              const parsed = JSON.parse(evt.data);
              if (parsed.type === "text" || parsed.text) {
                setStreamingText((prev) => prev + (parsed.text ?? ""));
              }
            } catch {
              // Not JSON — might be raw text
            }
          }
        });

        // Use the final response
        const textParts = response?.parts?.filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
        );
        const assistantText =
          textParts?.map((p) => p.text).join("") || streamingText || "(No response)";

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: assistantText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `Error: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        setStreamingText("");
      }
    },
    [sessionId, streamingText],
  );

  return (
    <div className="app-shell">
      {/* Left Rail */}
      <nav className="left-rail">
        <div className="flex flex-col items-center gap-1 pt-4 pb-2">
          {/* Logo */}
          <div className="w-10 h-10 rounded-lg bg-[var(--amber-dim)] flex items-center justify-center mb-4">
            <span className="text-[var(--amber)] font-bold text-lg font-[family-name:var(--font-display)]">G</span>
          </div>

          {/* Nav icons */}
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={item.label}
              className={`group relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                activeView === item.id
                  ? "bg-[var(--amber-dim)] text-[var(--amber)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-[var(--bg-card)] text-[var(--text)] rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Drawer toggle */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          title={drawerOpen ? "Close drawer" : "Open drawer"}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={drawerOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
          </svg>
        </button>
      </nav>

      {/* Center Workspace */}
      <main className="center-workspace">
        {/* Connection status bar */}
        {connectionStatus !== "connected" && (
          <div className={`px-4 py-2 text-sm text-center ${
            connectionStatus === "connecting"
              ? "bg-[var(--amber-dim)] text-[var(--amber)]"
              : "bg-[var(--red-dim)] text-[var(--red)]"
          }`}>
            {connectionStatus === "connecting"
              ? "Connecting to OpenCode..."
              : `Connection failed: ${error}`}
          </div>
        )}

        {activeView === "play" && (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            streamingText={streamingText}
          />
        )}

        {activeView !== "play" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-[var(--text-dim)] text-sm">
                {NAV_ITEMS.find((n) => n.id === activeView)?.label} view
              </p>
              <p className="text-[var(--text-dim)] text-xs">Coming soon</p>
            </div>
          </div>
        )}
      </main>

      {/* Right Drawer */}
      {drawerOpen && (
        <aside className="right-drawer">
          <DrawerContent />
        </aside>
      )}

      {/* Bottom Bar */}
      <footer className="bottom-bar" style={{ gridColumn: drawerOpen ? "1 / -1" : "1 / -1" }}>
        <div className="flex items-center justify-between px-4 h-full text-xs text-[var(--text-dim)]">
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-label)]">Dice</span>
            <span className="text-[var(--text-secondary)]">--</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-label)]">Clocks</span>
            <span className="text-[var(--text-secondary)]">--</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[var(--text-label)]">Calendar</span>
            <span className="text-[var(--text-secondary)]">--</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-label)]">Danger</span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--green-dim)] text-[var(--green)] text-[10px] font-semibold uppercase">
              Safe
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DrawerContent() {
  const [activeTab, setActiveTab] = useState<"quests" | "npcs" | "log">("quests");

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-2">
        {(["quests", "npcs", "log"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? "text-[var(--amber)] border-b-2 border-[var(--amber)]"
                : "text-[var(--text-dim)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-[var(--text-dim)] text-xs text-center mt-8">
          {activeTab === "quests" && "Quest tracking will appear here during play."}
          {activeTab === "npcs" && "NPCs you encounter will be listed here."}
          {activeTab === "log" && "Session log entries will stream here."}
        </p>
      </div>
    </div>
  );
}
