import { ANALYTICS } from "../data/mock";

export default function AnalyticsView() {
  // Analytics stays on mock data for now — deferred to Phase 2
  const { summary } = ANALYTICS;

  return (
    <div className="overflow-y-auto h-full p-5 px-6">
      <div className="view-header">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[var(--text)] tracking-[0.02em]">
            Analytics
          </span>
          <span className="text-[11px] text-[var(--text-dim)]">Play patterns and campaign statistics</span>
        </div>
      </div>

      {/* Play Summary */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-label)] font-semibold">
            Play Summary
          </span>
        </div>
        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {summary.map((stat) => (
              <div key={stat.label} className="text-center py-1.5 px-3 bg-[var(--bg-card)] rounded-lg">
                <div className="font-[family-name:var(--font-mono)] text-lg font-medium text-[var(--text)] leading-none">
                  {stat.value}
                </div>
                <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)] mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Type Distribution */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-label)] font-semibold">
            Activity Type Distribution
          </span>
        </div>
        <div className="px-4 py-8 text-center text-[12px] text-[var(--text-dim)]">
          [ Bar chart placeholder — Combat / Exploration / Social / Downtime ratios ]
        </div>
      </div>

      {/* Myth Omen History */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-label)] font-semibold">
            Myth Omen History
          </span>
        </div>
        <div className="px-4 py-8 text-center text-[12px] text-[var(--text-dim)]">
          [ Line chart placeholder — omen levels over calendar days ]
        </div>
      </div>
    </div>
  );
}
