import { useWorldState } from "../lib/world-state";

export default function BottomBar() {
  const { character, clocks, dooms, calendar, status } = useWorldState();

  const resources = character?.countdownDice ?? [];
  const danger = character?.location.danger ?? "safe";
  const dangerLabel = danger === "safe" ? "Safe Zone" : danger === "unsafe" ? "Unsafe" : "Risky";
  const calendarStr = calendar ? `Day ${calendar.day}, ${calendar.month}` : "";

  if (status === "empty") {
    return (
      <div className="flex items-center gap-6 px-5 h-full text-[11px]">
        <span className="text-[var(--text-dim)]">Start a campaign to see game status</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6 px-5 h-full text-[11px] overflow-x-auto">
      {/* Resources */}
      {resources.length > 0 && (
        <>
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)]">Resources</span>
            {resources.map((r) => (
              <span
                key={r.name}
                className={`flex items-center gap-1 font-[family-name:var(--font-mono)] text-[11px] ${
                  r.low ? "text-[var(--red)]" : "text-[var(--text-secondary)]"
                }`}
              >
                <span className="text-[12px]">{r.icon}</span> {r.die}
              </span>
            ))}
          </div>
          <div className="bar-divider" />
        </>
      )}

      {/* Clocks */}
      {clocks.length > 0 && (
        <>
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)]">Clocks</span>
            {clocks.map((clock) => (
              <div key={clock.name} className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: clock.total }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-[2px] border ${
                        i < clock.filled
                          ? "bg-[var(--amber)] border-[var(--amber)]"
                          : "bg-transparent border-[var(--border-light)]"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-[var(--text-dim)] max-w-[80px] overflow-hidden text-ellipsis">
                  {clock.name}
                </span>
              </div>
            ))}
          </div>
          <div className="bar-divider" />
        </>
      )}

      {/* Omens */}
      {dooms.length > 0 && (
        <>
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)]">Omens</span>
            {dooms.filter((m) => m.omens > 0).map((myth) => (
              <div key={myth.name} className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: myth.maxOmens }, (_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full border ${
                        i < myth.omens
                          ? "bg-[var(--red)] border-[var(--red)]"
                          : "border-[var(--border-light)]"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-[var(--text-dim)]">{myth.name}</span>
              </div>
            ))}
          </div>
          <div className="bar-divider" />
        </>
      )}

      {/* Calendar */}
      {calendarStr && (
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[11px] whitespace-nowrap">
          <span className="text-[13px]">{"\u{1F4C5}"}</span>
          {calendarStr}
        </div>
      )}

      {/* Danger badge — pushed right */}
      <div className="ml-auto">
        <span
          className={`text-[10px] uppercase tracking-[0.06em] font-semibold px-2 py-0.5 rounded ${
            danger === "safe"
              ? "bg-[var(--green-dim)] text-[var(--green)]"
              : danger === "unsafe"
                ? "bg-[var(--amber-dim)] text-[var(--amber)]"
                : "bg-[var(--red-dim)] text-[var(--red)]"
          }`}
        >
          {dangerLabel}
        </span>
      </div>
    </div>
  );
}
