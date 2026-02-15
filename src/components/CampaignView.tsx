import { useWorldState } from "../lib/world-state";

export default function CampaignView() {
  const { calendar, dooms, status } = useWorldState();

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-3xl mb-3">{"\u{1F5FA}\uFE0F"}</div>
        <div className="font-[family-name:var(--font-display)] text-[16px] text-[var(--text-dim)] mb-1">
          No Campaign
        </div>
        <div className="text-[12px] text-[var(--text-dim)]">
          Start a campaign in the Play tab to see the campaign overview.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-5 px-6">
      <div className="view-header">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[var(--text)] tracking-[0.02em]">
            Campaign Overview
          </span>
          {calendar && (
            <span className="text-[11px] text-[var(--text-dim)]">
              Day {calendar.day}, {calendar.month}
            </span>
          )}
        </div>
      </div>

      {/* Calendar */}
      {calendar && (
        <Card title="Calendar">
          <div className="text-[12px] text-[var(--text-secondary)]">
            <strong className="text-[var(--text)]">
              Day {calendar.day}, {calendar.month}
            </strong>{" "}
            · {calendar.season} · {calendar.weather}
            {calendar.upcoming && (
              <>
                <br />
                <span className="text-[var(--text-dim)]">{calendar.upcoming}</span>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Myths */}
      {dooms.length > 0 && (
        <Card title="Myths">
          {dooms.map((myth, i) => (
            <div
              key={myth.name}
              className={`flex items-center justify-between py-1.5 ${
                i < dooms.length - 1 ? "border-b border-[var(--border)]" : ""
              }`}
            >
              <span className="text-[12px] text-[var(--text)]">{myth.name}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: myth.maxOmens }, (_, j) => (
                  <div
                    key={j}
                    className={`w-1.5 h-1.5 rounded-full border ${
                      j < myth.omens
                        ? "bg-[var(--red)] border-[var(--red)]"
                        : "border-[var(--border-light)]"
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-label)] font-semibold">
          {title}
        </span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
