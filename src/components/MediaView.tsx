import { MEDIA } from "../data/mock";

export default function MediaView() {
  // Media/chronicles stays on mock data for now — deferred to Phase 2
  const { chronicles } = MEDIA;

  const statusStyles = {
    read: "bg-[var(--green-dim)] text-[var(--green)]",
    writing: "bg-[var(--amber-dim)] text-[var(--amber)]",
    planned: "bg-[var(--bg-card)] text-[var(--text-dim)]",
  };

  const statusLabels = { read: "Read", writing: "Writing", planned: "Planned" };

  return (
    <div className="overflow-y-auto h-full p-5 px-6">
      <div className="view-header">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[var(--text)] tracking-[0.02em]">
            Story & Audio
          </span>
          <span className="text-[11px] text-[var(--text-dim)]">
            {chronicles.length} chapter{chronicles.length !== 1 ? "s" : ""} · 0 audiobooks
          </span>
        </div>
      </div>

      {/* Chronicles */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-label)] font-semibold">
            Chronicles
          </span>
        </div>
        <div className="px-4 py-3">
          {chronicles.map((ch, i) => (
            <div
              key={ch.title}
              className={`flex items-center justify-between py-2 ${
                i < chronicles.length - 1 ? "border-b border-[var(--border)]" : ""
              }`}
            >
              <div>
                <strong className="text-[12px] text-[var(--text)]">{ch.title}</strong>
                <br />
                <span className="text-[11px] text-[var(--text-dim)]">{ch.detail}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded ${statusStyles[ch.status]}`}>
                {statusLabels[ch.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
