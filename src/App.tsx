import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { initClient, createSession, sendMessage } from "./lib/opencode";
import ChatView from "./components/ChatView";
import CharacterView from "./components/CharacterView";
import GMScreenView from "./components/GMScreenView";
import CampaignView from "./components/CampaignView";
import MediaView from "./components/MediaView";
import AnalyticsView from "./components/AnalyticsView";
import BottomBar from "./components/BottomBar";
import { WorldProvider, useWorldState } from "./lib/world-state";

type View = "play" | "character" | "gm" | "campaign" | "media" | "analytics";

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
  { id: "campaign", label: "Campaign", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { id: "media", label: "Media", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  { id: "analytics", label: "Analytics", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
];

export default function App() {
  const [activeView, setActiveView] = useState<View>("play");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const streamingTextRef = useRef("");
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
      streamingTextRef.current = "";

      try {
        const response = await sendMessage(sessionId, text, (event) => {
          const evt = event as { data?: string };
          if (evt.data) {
            try {
              const parsed = JSON.parse(evt.data);
              if (parsed.type === "text" || parsed.text) {
                setStreamingText((prev) => {
                  const next = prev + (parsed.text ?? "");
                  streamingTextRef.current = next;
                  return next;
                });
              }
            } catch {
              // Not JSON
            }
          }
        });

        const textParts = response?.parts?.filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
        );
        const assistantText =
          textParts?.map((p) => p.text).join("") || streamingTextRef.current || "(No response)";

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
    [sessionId],
  );

  const shell = (
    <div className="app-shell">
      {/* Left Rail */}
      <nav className="left-rail">
        <div className="flex flex-col items-center gap-1 pt-3 pb-2">
          {/* Logo */}
          <div className="w-9 h-9 rounded-[10px] bg-[var(--amber-dim)] border border-[var(--amber)] flex items-center justify-center mb-2">
            <span className="text-[var(--amber)] font-bold text-[16px] font-[family-name:var(--font-display)]">G</span>
          </div>

          <div className="w-7 h-px bg-[var(--border)] my-1.5" />

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
              <span className="absolute left-full ml-2 px-2 py-1 text-xs bg-[var(--bg-card)] text-[var(--text)] rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </span>
            </button>
          ))}

          <div className="w-7 h-px bg-[var(--border)] my-1.5" />

          {/* Drawer toggle */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            title={drawerOpen ? "Close drawer" : "Open drawer"}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={drawerOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
            </svg>
          </button>
        </div>

        {/* Character minicard */}
        <CharacterMinicard />
      </nav>

      {/* Center Workspace */}
      <main className="center-workspace">
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
        {activeView === "character" && <CharacterView />}
        {activeView === "gm" && <GMScreenView />}
        {activeView === "campaign" && <CampaignView />}
        {activeView === "media" && <MediaView />}
        {activeView === "analytics" && <AnalyticsView />}
      </main>

      {/* Right Drawer */}
      {drawerOpen && (
        <aside className="right-drawer">
          <DrawerContent />
        </aside>
      )}

      {/* Bottom Bar */}
      <footer className="bottom-bar">
        <BottomBar />
      </footer>
    </div>
  );

  // Wrap in WorldProvider only when connected — provider fetches world files via SDK
  if (connectionStatus === "connected") {
    return <WorldProvider>{shell}</WorldProvider>;
  }
  return shell;
}

function CharacterMinicard() {
  const { character } = useWorldState();

  if (!character) {
    return (
      <div className="flex flex-col items-center gap-0.5 pb-3 mt-auto">
        <div className="text-lg text-[var(--text-dim)]">{"\u2694\uFE0F"}</div>
        <div className="text-[9px] text-[var(--text-dim)] leading-tight">--/--</div>
      </div>
    );
  }

  const hpPercent = character.maxHp > 0 ? Math.round((character.hp / character.maxHp) * 100) : 0;
  const hpColor = hpPercent > 50 ? "var(--green)" : hpPercent > 25 ? "var(--amber)" : "var(--red)";

  return (
    <div className="flex flex-col items-center gap-0.5 pb-3 mt-auto">
      <div className="text-lg">{"\u2694\uFE0F"}</div>
      <div className="w-9 h-1 bg-[var(--bg-card)] rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{ width: `${hpPercent}%`, background: hpColor }}
        />
      </div>
      <div className="text-[9px] text-[var(--text-dim)] leading-tight">
        {character.hp}/{character.maxHp}
      </div>
      <div className="text-[9px] text-[var(--amber)] leading-tight">
        A{character.armor}
      </div>
    </div>
  );
}

function DrawerContent() {
  const [activeTab, setActiveTab] = useState<"quests" | "npcs" | "log">("quests");
  const { quests, npcs, logEntries, status } = useWorldState();

  const tagStyles: Record<string, string> = {
    event: "text-[var(--amber)] bg-[var(--amber-dim)]",
    discovery: "text-[var(--green)] bg-[var(--green-dim)]",
    thread: "text-[var(--blue)] bg-[var(--blue-dim)]",
    advance: "text-[var(--red)] bg-[var(--red-dim)]",
  };

  const dispositionStyles: Record<string, string> = {
    friendly: "bg-[var(--green-dim)] text-[var(--green)]",
    neutral: "bg-[var(--blue-dim)] text-[var(--blue)]",
    cautious: "bg-[var(--blue-dim)] text-[var(--blue)]",
    hostile: "bg-[var(--red-dim)] text-[var(--red)]",
  };

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="text-2xl mb-2">{"\u{1F4DC}"}</div>
        <div className="text-[13px] text-[var(--text-dim)]">
          Start a campaign to see quests, NPCs, and session log here.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-2 shrink-0">
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
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "quests" && (
          <>
            {/* Active quests */}
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-dim)] mb-2">Active</div>
            {quests.filter((q) => q.status === "active").map((quest) => (
              <div key={quest.name} className="py-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-px rounded uppercase tracking-[0.05em] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                    Active
                  </span>
                  <span className="text-[13px] font-medium text-[var(--text)]">{quest.name}</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] leading-[1.5] mt-0.5">{quest.description}</p>
              </div>
            ))}

            {/* Developing quests */}
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-dim)] mt-3.5 mb-2">Developing</div>
            {quests.filter((q) => q.status === "developing").map((quest) => (
              <div key={quest.name} className="py-2.5 border-b border-[var(--border)] last:border-b-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-px rounded uppercase tracking-[0.05em] font-semibold bg-[var(--blue-dim)] text-[var(--blue)]">
                    Developing
                  </span>
                  <span className="text-[13px] font-medium text-[var(--text)]">{quest.name}</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] leading-[1.5] mt-0.5">{quest.description}</p>
              </div>
            ))}
          </>
        )}

        {activeTab === "npcs" &&
          npcs.map((npc) => (
            <div key={npc.name} className="py-2.5 border-b border-[var(--border)] last:border-b-0">
              <div className="text-[13px] font-medium text-[var(--text)]">{npc.name}</div>
              <div className="text-[11px] text-[var(--text-dim)] mt-0.5">
                {npc.location} · {npc.role}
              </div>
              <span
                className={`inline-block text-[10px] px-1.5 py-px rounded mt-1 ${dispositionStyles[npc.disposition]}`}
              >
                {npc.disposition.charAt(0).toUpperCase() + npc.disposition.slice(1)}
              </span>
            </div>
          ))}

        {activeTab === "log" &&
          logEntries.map((entry, i) => (
            <div key={i} className="flex gap-2 py-1.5 border-b border-[var(--border)] last:border-b-0 text-[11px]">
              <span
                className={`font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-px rounded whitespace-nowrap self-start mt-0.5 ${tagStyles[entry.tag]}`}
              >
                {entry.tag}
              </span>
              <span className="text-[var(--text-secondary)] leading-[1.5]">{entry.text}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
