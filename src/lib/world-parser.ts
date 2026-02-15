import matter from "gray-matter";
import type {
  CharacterData,
  NPCData,
  QuestData,
  LogEntry,
  MythEntry,
  ClockData,
  CalendarData,
  GMScreenData,
  StatBlock,
  CountdownDie,
  InventoryItem,
  Feature,
  SecretEntry,
  NPCMove,
} from "../data/types";

// ── Character ──────────────────────────────────────────────

export function parseCharacterFile(raw: string): CharacterData | null {
  const { data, content } = matter(raw);
  if (!data.name) return null;

  const stats = parseStats(data.stats);
  const countdownDice = parseCountdownDice(data.countdown_dice);
  const inventory = parseInventorySection(content);
  const gold = parseGold(content);
  const slotsInfo = parseSlotsInfo(content);
  const classFeatures = parseFeatureList(data.class_features);
  const ancestryTraits = parseAncestryTraits(data.ancestry_traits, data.languages);

  return {
    name: data.name,
    ancestry: data.ancestry ?? "Unknown",
    class: data.class ?? "Unknown",
    level: data.level ?? 1,
    background: data.background ?? "",
    hp: data.hp?.current ?? data.hp ?? 0,
    maxHp: data.hp?.max ?? data.hp ?? 0,
    armor: data.armor ?? 0,
    gold,
    stats,
    training: data.training ?? [],
    countdownDice,
    inventory,
    slotsUsed: slotsInfo.used,
    slotsMax: slotsInfo.max,
    classFeatures,
    ancestryTraits,
    location: {
      name: data.current_location ?? "Unknown",
      description: "",
      danger: "safe",
    },
  };
}

function parseStats(raw: Record<string, number> | undefined): StatBlock[] {
  if (!raw) return [];
  return Object.entries(raw).map(([key, value]) => ({
    name: key.toUpperCase(),
    value,
  }));
}

function parseCountdownDice(raw: Record<string, string> | undefined): CountdownDie[] {
  if (!raw) return [];
  const icons: Record<string, string> = {
    torches: "\u{1F525}",
    rations: "\u{1F356}",
    arrows: "\u{1F3F9}",
    ammo: "\u{1F3AF}",
    oil: "\u{1F9F4}",
    water: "\u{1F4A7}",
  };
  return Object.entries(raw).map(([name, die]) => {
    const dieStr = String(die).replace(/^cd/, "d");
    const dieSize = parseInt(dieStr.replace("d", ""), 10) || 0;
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      icon: icons[name.toLowerCase()] ?? "\u{1F4E6}",
      die: dieStr,
      low: dieSize <= 4,
    };
  });
}

function parseInventorySection(markdown: string): InventoryItem[] {
  const section = extractSection(markdown, "Inventory");
  if (!section) return [];
  const items: InventoryItem[] = [];
  for (const line of section.split("\n")) {
    const match = line.match(/^-\s+(.+)/);
    if (!match) continue;
    const text = match[1].trim();
    const slotMatch = text.match(/\((\d+)\s+slots?\)/i);
    const detail = slotMatch ? `${slotMatch[1]} slot${slotMatch[1] === "1" ? "" : "s"}` : "";
    const worn = /worn|equipped/i.test(text);
    const name = text.replace(/\s*\(\d+\s+slots?\)/i, "").replace(/\s*·\s*worn/i, "").trim();
    items.push({ name, icon: "", detail: detail || (worn ? "worn" : ""), worn });
  }
  return items;
}

function parseGold(markdown: string): number {
  const match = markdown.match(/\*\*Gold:\*\*\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseSlotsInfo(markdown: string): { used: number; max: number } {
  const match = markdown.match(/\*\*Gear Slots:\*\*\s*(\d+)\s*\/\s*(\d+)/);
  if (match) return { used: parseInt(match[1], 10), max: parseInt(match[2], 10) };
  return { used: 0, max: 12 };
}

function parseFeatureList(raw: string[] | undefined): Feature[] {
  if (!raw) return [];
  return raw.map((f) => {
    const match = f.match(/^(.+?)\s*\((.+)\)$/);
    if (match) return { name: match[1].trim(), description: match[2].trim() };
    return { name: f, description: "" };
  });
}

function parseAncestryTraits(traits: string[] | undefined, languages: string[] | undefined): Feature[] {
  const result: Feature[] = [];
  if (traits) {
    for (const t of traits) {
      const match = t.match(/^(.+?)\s*\((.+)\)$/);
      if (match) result.push({ name: match[1].trim(), description: match[2].trim() });
      else result.push({ name: t, description: "" });
    }
  }
  if (languages && languages.length > 0) {
    result.push({ name: "Languages", description: languages.join(", ") });
  }
  return result;
}

// ── NPC ────────────────────────────────────────────────────

export function parseNPCFile(raw: string): NPCData | null {
  const { data } = matter(raw);
  if (!data.name) return null;
  return {
    name: data.name,
    location: formatLocationName(data.location ?? ""),
    role: data.current_goal || data.type || "NPC",
    disposition: normalizeDisposition(data.disposition),
  };
}

function formatLocationName(loc: string): string {
  return loc
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeDisposition(d: string | undefined): NPCData["disposition"] {
  const valid = ["friendly", "neutral", "cautious", "hostile"];
  if (d && valid.includes(d)) return d as NPCData["disposition"];
  return "neutral";
}

// ── Quests ─────────────────────────────────────────────────

export function parseQuestsFile(raw: string): QuestData[] {
  const quests: QuestData[] = [];
  let currentStatus: QuestData["status"] = "active";

  for (const line of raw.split("\n")) {
    const headerMatch = line.match(/^##\s+(\w+)/);
    if (headerMatch) {
      const s = headerMatch[1].toLowerCase();
      if (s === "active") currentStatus = "active";
      else if (s === "developing") currentStatus = "developing";
      else if (s === "completed") currentStatus = "completed";
      continue;
    }

    const questMatch = line.match(/^-\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)/);
    if (questMatch) {
      quests.push({
        name: questMatch[1].trim(),
        description: questMatch[2].replace(/\s*\*.*?\*\s*$/, "").trim(),
        status: currentStatus,
      });
    }
  }
  return quests;
}

// ── Session Log ────────────────────────────────────────────

export function parseSessionLog(raw: string): LogEntry[] {
  const entries: LogEntry[] = [];
  const validTags = ["event", "discovery", "thread", "advance"];

  for (const line of raw.split("\n")) {
    const match = line.match(/^-\s+\[(\w[\w-]*)\]\s+(.+)/);
    if (!match) continue;
    let tag = match[1].toLowerCase();
    if (tag === "world-advance") tag = "advance";
    if (tag === "ruling") continue; // not displayed in frontend
    if (!validTags.includes(tag)) continue;
    entries.push({
      tag: tag as LogEntry["tag"],
      text: match[2].trim(),
    });
  }
  // Most recent first
  return entries.reverse();
}

// ── Dooms ──────────────────────────────────────────────────

export function parseDoomsFile(raw: string): MythEntry[] {
  const myths: MythEntry[] = [];
  let currentName = "";

  for (const line of raw.split("\n")) {
    const nameMatch = line.match(/^##\s+(.+)/);
    if (nameMatch) {
      currentName = nameMatch[1].trim();
      continue;
    }

    const portentMatch = line.match(/\*\*Portent Level:\*\*\s*(\d+)\s*\/\s*(\d+)/);
    if (portentMatch && currentName) {
      myths.push({
        name: currentName,
        omens: parseInt(portentMatch[1], 10),
        maxOmens: parseInt(portentMatch[2], 10),
      });
    }
  }
  return myths;
}

// ── Clocks ─────────────────────────────────────────────────

export function parseClocksFile(raw: string): ClockData[] {
  const clocks: ClockData[] = [];
  let currentName = "";

  for (const line of raw.split("\n")) {
    const nameMatch = line.match(/^##\s+(.+)/);
    if (nameMatch) {
      currentName = nameMatch[1].trim();
      continue;
    }

    const segmentsMatch = line.match(/\*\*Segments:\*\*\s*(\d+)\s*\/\s*(\d+)/);
    if (segmentsMatch && currentName) {
      clocks.push({
        name: currentName,
        filled: parseInt(segmentsMatch[1], 10),
        total: parseInt(segmentsMatch[2], 10),
      });
    }
  }
  return clocks;
}

// ── Calendar ───────────────────────────────────────────────

export function parseCalendarFile(raw: string): CalendarData | null {
  const dateSection = extractSection(raw, "Current Date");
  if (!dateSection) return null;

  const dateMatch = dateSection.match(/Day\s+(\d+)\s+of\s+(?:the\s+)?(.+?)(?:,|\n|$)/i);
  const day = dateMatch ? parseInt(dateMatch[1], 10) : 1;
  const month = dateMatch ? dateMatch[2].trim() : "Unknown";

  const seasonSection = extractSection(raw, "Season") ?? "";
  const season = seasonSection.split("\n")[0]?.replace(/\.\s.*/, "").trim() || "";

  const weatherSection = extractSection(raw, "Recent Weather") ?? "";
  const weather = weatherSection.split("\n")[0]?.trim() || "";

  const upcomingSection = extractSection(raw, "Notable Upcoming Events") ?? "";
  const upcoming = upcomingSection
    .split("\n")
    .filter((l) => l.startsWith("-"))
    .map((l) => l.replace(/^-\s+/, "").trim())
    .join(" · ");

  return { day, month, season, weather, upcoming };
}

// ── GM Notes ───────────────────────────────────────────────

export function parseGMNotesFile(raw: string): GMScreenData | null {
  if (!raw.trim()) return null;

  const strongStart = extractStrongStart(raw);
  const secrets = extractSecrets(raw);
  const npcMoves = extractNPCMoves(raw);

  return { strongStart, secrets, npcMoves };
}

function extractStrongStart(raw: string): string {
  const section = extractSection(raw, "Strong Starts");
  if (!section) return "";
  // Skip the first H3 title, grab the prose
  const lines = section.split("\n");
  const proseLines: string[] = [];
  let pastFirstH3 = false;
  for (const line of lines) {
    if (line.match(/^###\s+/)) {
      if (pastFirstH3) break; // second strong start, stop
      pastFirstH3 = true;
      continue;
    }
    if (pastFirstH3) proseLines.push(line);
  }
  return proseLines.join(" ").trim();
}

function extractSecrets(raw: string): SecretEntry[] {
  const section = extractSection(raw, "Active Secrets");
  if (!section) return [];
  const secrets: SecretEntry[] = [];
  let currentTitle = "";
  let info = "";
  let discovery = "";

  for (const line of section.split("\n")) {
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      if (currentTitle && currentTitle !== "Discovered") {
        secrets.push({ title: currentTitle, description: info, discovery });
      }
      currentTitle = h3[1].trim();
      info = "";
      discovery = "";
      continue;
    }
    const infoMatch = line.match(/\*\*Information:\*\*\s*(.+)/);
    if (infoMatch) { info = infoMatch[1].trim(); continue; }
    const discMatch = line.match(/\*\*Discovery paths:\*\*\s*(.+)/);
    if (discMatch) { discovery = discMatch[1].trim(); continue; }
  }
  // Flush last
  if (currentTitle && currentTitle !== "Discovered") {
    secrets.push({ title: currentTitle, description: info, discovery });
  }
  return secrets;
}

function extractNPCMoves(raw: string): NPCMove[] {
  const section = extractSection(raw, "NPC Moves");
  if (!section) return [];
  const moves: NPCMove[] = [];
  let currentName = "";
  const planLines: string[] = [];

  for (const line of section.split("\n")) {
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      if (currentName) {
        moves.push({ name: currentName, plan: planLines.join(" ").trim() });
        planLines.length = 0;
      }
      currentName = h3[1].trim();
      continue;
    }
    if (currentName && line.trim()) {
      // Extract the Doing/Wants/Hook fields into a plan string
      const doingMatch = line.match(/\*\*Doing:\*\*\s*(.+?)(?:\s*\||$)/);
      const wantsMatch = line.match(/\*\*Wants:\*\*\s*(.+?)(?:\s*\||$)/);
      const hookMatch = line.match(/\*\*Hook:\*\*\s*(.+)/);
      if (doingMatch) planLines.push(doingMatch[1].trim());
      else if (wantsMatch) planLines.push(wantsMatch[1].trim());
      else if (hookMatch) planLines.push(hookMatch[1].replace(/^"|"$/g, "").trim());
    }
  }
  if (currentName) {
    moves.push({ name: currentName, plan: planLines.join(" ").trim() });
  }
  return moves;
}

// ── Helpers ────────────────────────────────────────────────

function extractSection(markdown: string, heading: string): string | null {
  // Match ## heading (case-insensitive) and capture everything until the next ##
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|\\z)`, "mi");
  const match = markdown.match(regex);
  if (!match) return null;
  return match[1].trim();
}
