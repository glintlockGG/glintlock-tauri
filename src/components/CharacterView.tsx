import { useWorldState } from "../lib/world-state";

export default function CharacterView() {
  const { character, status } = useWorldState();

  if (status === "empty" || !character) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-3xl mb-3">{"\u2694\uFE0F"}</div>
        <div className="font-[family-name:var(--font-display)] text-[16px] text-[var(--text-dim)] mb-1">
          No Character Yet
        </div>
        <div className="text-[12px] text-[var(--text-dim)]">
          Start a campaign in the Play tab to create your character.
        </div>
      </div>
    );
  }

  const c = character;
  const hpPercent = c.maxHp > 0 ? Math.round((c.hp / c.maxHp) * 100) : 0;
  const hpColor = hpPercent > 50 ? "var(--green)" : hpPercent > 25 ? "var(--amber)" : "var(--red)";

  return (
    <div className="overflow-y-auto h-full p-5 px-6">
      {/* View header */}
      <div className="view-header">
        <div className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-[var(--text)] tracking-[0.02em]">
            Character Sheet
          </span>
        </div>
      </div>

      {/* Hero banner */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center p-4 px-5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-4">
        <div className="w-14 h-14 rounded-xl bg-[var(--bg-card)] border-2 border-[var(--border-light)] flex items-center justify-center text-2xl">
          {"\u2694\uFE0F"}
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--text)] leading-tight">
            {c.name}
          </h2>
          <div className="text-[12px] text-[var(--text-dim)] mt-0.5">
            {c.ancestry} {c.class} — Level {c.level} · {c.background}
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <VitalBlock value={c.hp} label="HP" />
          <VitalBlock value={c.armor} label="Armor" />
          <VitalBlock value={c.gold} label="Gold" color="var(--amber)" />
        </div>
      </div>

      {/* HP Bar */}
      <div className="p-3 px-5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-[var(--text-dim)] uppercase tracking-[0.06em]">Hit Points</span>
          <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--text-secondary)]">
            {c.hp} / {c.maxHp}
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-card)] rounded">
          <div
            className="h-full rounded transition-all duration-400"
            style={{ width: `${hpPercent}%`, background: hpColor }}
          />
        </div>
      </div>

      {/* Stats grid */}
      {c.stats.length > 0 && (
        <div className="grid grid-cols-6 gap-2 mb-4">
          {c.stats.map((stat) => (
            <div
              key={stat.name}
              className="text-center py-2.5 px-1 pb-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg"
            >
              <div className="font-[family-name:var(--font-mono)] text-xl font-medium text-[var(--text)] leading-none">
                {stat.value}
              </div>
              <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)] mt-1">
                {stat.name}
              </div>
              {stat.trained && (
                <div className="text-[8px] text-[var(--amber)] mt-0.5">{stat.trained}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Training + Countdown Dice */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Training */}
        {c.training.length > 0 && (
          <Card title="Training">
            <div className="flex flex-wrap gap-1.5">
              {c.training.map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2.5 py-0.5 rounded-xl bg-[var(--amber-dim)] text-[var(--amber)] border border-[rgba(232,164,74,0.2)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Countdown Dice */}
        {c.countdownDice.length > 0 && (
          <Card title="Countdown Dice">
            {c.countdownDice.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-b-0 text-[12px]"
              >
                <span className="text-[var(--text-secondary)]">
                  {d.icon} {d.name}
                </span>
                <span
                  className={`font-[family-name:var(--font-mono)] text-[12px] px-2 py-0.5 rounded bg-[var(--bg-card)] ${
                    d.low ? "text-[var(--red)] bg-[var(--red-dim)]" : "text-[var(--text)]"
                  }`}
                >
                  {d.die}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Inventory */}
      {c.inventory.length > 0 && (
        <Card title="Inventory" badge={`${c.slotsUsed} / ${c.slotsMax} slots`}>
          {c.inventory.map((item) => (
            <div
              key={item.name}
              className={`flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-b-0 text-[12px] ${
                item.worn ? "text-[var(--text-dim)] italic" : ""
              }`}
            >
              <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                {item.icon && <span>{item.icon}</span>} {item.name}
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-dim)]">
                {item.detail}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Class Features + Ancestry Traits */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {c.classFeatures.length > 0 && (
          <Card title="Class Features">
            {c.classFeatures.map((f) => (
              <div key={f.name} className="text-[12px] text-[var(--text-secondary)] mb-1.5 last:mb-0">
                <strong className="text-[var(--text)]">{f.name}</strong> — {f.description}
              </div>
            ))}
          </Card>
        )}
        {c.ancestryTraits.length > 0 && (
          <Card title="Ancestry Traits">
            {c.ancestryTraits.map((f) => (
              <div key={f.name} className="text-[12px] text-[var(--text-secondary)] mb-1.5 last:mb-0">
                <strong className="text-[var(--text)]">{f.name}</strong> — {f.description}
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* Location */}
      <Card
        title="Current Location"
        badge={
          <span
            className={`text-[10px] uppercase tracking-[0.06em] font-semibold px-2 py-0.5 rounded ${
              c.location.danger === "safe"
                ? "bg-[var(--green-dim)] text-[var(--green)]"
                : c.location.danger === "unsafe"
                  ? "bg-[var(--amber-dim)] text-[var(--amber)]"
                  : "bg-[var(--red-dim)] text-[var(--red)]"
            }`}
          >
            {c.location.danger === "safe" ? "Safe" : c.location.danger === "unsafe" ? "Unsafe" : "Risky"}
          </span>
        }
      >
        <div className="text-[12px] text-[var(--text-secondary)]">
          <strong className="text-[var(--text)]">{c.location.name}</strong>
          {c.location.description && (
            <>
              <br />
              {c.location.description}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function VitalBlock({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div className="text-center py-1.5 px-3 bg-[var(--bg-card)] rounded-lg min-w-[56px]">
      <div
        className="font-[family-name:var(--font-mono)] text-lg font-medium leading-none"
        style={{ color: color ?? "var(--text)" }}
      >
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[0.08em] text-[var(--text-dim)] mt-0.5">{label}</div>
    </div>
  );
}

function Card({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-label)] font-semibold">
          {title}
        </span>
        {typeof badge === "string" ? (
          <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-dim)]">
            {badge}
          </span>
        ) : (
          badge
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
