import { useWorldState } from "../lib/world-state";

export default function GMScreenView() {
  const { gmNotes, status } = useWorldState();

  if (status === "empty" || !gmNotes) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-3xl mb-3">{"\u{1F4D6}"}</div>
        <div className="font-[family-name:var(--font-display)] text-[16px] text-[var(--text-dim)] mb-1">
          No GM Notes
        </div>
        <div className="text-[12px] text-[var(--text-dim)]">
          GM notes will appear here once a campaign is started.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-5 px-6">
      <div className="view-header">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[var(--text)] tracking-[0.02em]">
            GM Screen
          </span>
          <span className="text-[11px] text-[var(--text-dim)]">
            Behind the screen — session prep, NPC stats, myths, clocks
          </span>
        </div>
      </div>

      {/* Strong Start */}
      {gmNotes.strongStart && (
        <Card title="Strong Start">
          <p className="text-[12px] text-[var(--text-secondary)] leading-[1.7]">{gmNotes.strongStart}</p>
        </Card>
      )}

      {/* Active Secrets */}
      {gmNotes.secrets.length > 0 && (
        <Card title="Active Secrets" badge={`${gmNotes.secrets.length} undelivered`}>
          {gmNotes.secrets.map((secret, i) => (
            <div key={secret.title} className={`${i < gmNotes.secrets.length - 1 ? "mb-2.5" : ""}`}>
              <strong className="text-[12px] text-[var(--text)]">{secret.title}</strong>
              <span className="text-[12px] text-[var(--text-secondary)]"> — {secret.description}</span>
              {secret.discovery && (
                <div className="text-[11px] text-[var(--text-dim)] mt-0.5">Discovery: {secret.discovery}</div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* NPC Moves */}
      {gmNotes.npcMoves.length > 0 && (
        <Card title="NPC Moves">
          {gmNotes.npcMoves.map((move, i) => (
            <div key={move.name} className={`text-[12px] text-[var(--text-secondary)] ${i < gmNotes.npcMoves.length - 1 ? "mb-2" : ""}`}>
              <strong className="text-[var(--text)]">{move.name}</strong> — {move.plan}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-label)] font-semibold">
          {title}
        </span>
        {badge && (
          <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-dim)]">
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
