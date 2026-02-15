export interface StatBlock {
  name: string;
  value: number;
  trained?: string; // skill name if trained under this stat
}

export interface CountdownDie {
  name: string;
  icon: string;
  die: string; // "d4" | "d6" | "d8" | "d10" | "d12"
  low?: boolean;
}

export interface InventoryItem {
  name: string;
  icon: string;
  detail: string;
  worn?: boolean;
}

export interface Feature {
  name: string;
  description: string;
}

export interface CharacterData {
  name: string;
  ancestry: string;
  class: string;
  level: number;
  background: string;
  hp: number;
  maxHp: number;
  armor: number;
  gold: number;
  stats: StatBlock[];
  training: string[];
  countdownDice: CountdownDie[];
  inventory: InventoryItem[];
  slotsUsed: number;
  slotsMax: number;
  classFeatures: Feature[];
  ancestryTraits: Feature[];
  location: {
    name: string;
    description: string;
    danger: "safe" | "unsafe" | "risky";
  };
}

export interface SecretEntry {
  title: string;
  description: string;
  discovery: string;
}

export interface NPCMove {
  name: string;
  plan: string;
}

export interface GMScreenData {
  strongStart: string;
  secrets: SecretEntry[];
  npcMoves: NPCMove[];
}

export interface CalendarData {
  day: number;
  month: string;
  season: string;
  weather: string;
  upcoming: string;
}

export interface MythEntry {
  name: string;
  omens: number; // 0-6
  maxOmens: number;
}

export interface CampaignData {
  calendar: CalendarData;
  worldState: string;
  myths: MythEntry[];
}

export interface ChronicleEntry {
  title: string;
  detail: string;
  status: "read" | "writing" | "planned";
}

export interface MediaData {
  chronicles: ChronicleEntry[];
}

export interface VitalStat {
  value: number;
  label: string;
}

export interface AnalyticsData {
  summary: VitalStat[];
}

export interface ClockData {
  name: string;
  filled: number;
  total: number;
}

export interface QuestData {
  name: string;
  description: string;
  status: "active" | "developing" | "completed";
}

export interface NPCData {
  name: string;
  location: string;
  role: string;
  disposition: "friendly" | "neutral" | "cautious" | "hostile";
}

export interface LogEntry {
  tag: "event" | "discovery" | "thread" | "advance";
  text: string;
}

export interface BottomBarData {
  resources: CountdownDie[];
  clocks: ClockData[];
  omens: MythEntry[];
  calendar: string;
  danger: "safe" | "unsafe" | "risky";
  dangerLabel: string;
}
