import { readWorldFile, listWorldDirectory, subscribeToEvents } from "./opencode";
import {
  parseCharacterFile,
  parseNPCFile,
  parseQuestsFile,
  parseSessionLog,
  parseDoomsFile,
  parseClocksFile,
  parseCalendarFile,
  parseGMNotesFile,
} from "./world-parser";
import type { WorldState } from "./world-state";

/**
 * Fetch all world files via SDK and parse into WorldState.
 * Missing files are treated as empty, not errors.
 */
export async function fetchWorldState(): Promise<WorldState> {
  // List character and NPC directories in parallel with reading global files
  const [
    characterFiles,
    npcFiles,
    questsRaw,
    sessionLogRaw,
    doomsRaw,
    clocksRaw,
    calendarRaw,
    gmNotesRaw,
  ] = await Promise.allSettled([
    listWorldDirectory("world/characters"),
    listWorldDirectory("world/npcs"),
    readWorldFile("world/quests.md"),
    readWorldFile("world/session-log.md"),
    readWorldFile("world/dooms.md"),
    readWorldFile("world/clocks.md"),
    readWorldFile("world/calendar.md"),
    readWorldFile("world/gm-notes.md"),
  ]);

  // Parse character — use first .md file found
  let character = null;
  const charEntries = settled(characterFiles) ?? [];
  const charFile = charEntries.find((f) => f.endsWith(".md"));
  if (charFile) {
    const raw = await readWorldFile(`world/characters/${charFile}`);
    if (raw) character = parseCharacterFile(raw);
  }

  // Parse NPCs — all .md files
  const npcEntries = settled(npcFiles) ?? [];
  const npcPromises = npcEntries
    .filter((f) => f.endsWith(".md"))
    .map(async (f) => {
      const raw = await readWorldFile(`world/npcs/${f}`);
      if (!raw) return null;
      return parseNPCFile(raw);
    });
  const npcResults = await Promise.allSettled(npcPromises);
  const npcs = npcResults
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((n): n is NonNullable<typeof n> => n != null);

  // Parse global files
  const quests = parseQuestsFile(settled(questsRaw) ?? "");
  const logEntries = parseSessionLog(settled(sessionLogRaw) ?? "");
  const dooms = parseDoomsFile(settled(doomsRaw) ?? "");
  const clocks = parseClocksFile(settled(clocksRaw) ?? "");
  const calendar = parseCalendarFile(settled(calendarRaw) ?? "");
  const gmNotes = parseGMNotesFile(settled(gmNotesRaw) ?? "");

  // Determine status — if no character and no quests, world is empty (pre-/start)
  const isEmpty = !character && quests.length === 0 && dooms.length === 0;

  return {
    status: isEmpty ? "empty" : "loaded",
    character,
    npcs,
    quests,
    logEntries,
    dooms,
    clocks,
    calendar,
    gmNotes,
    lastUpdated: Date.now(),
  };
}

/**
 * Subscribe to world file changes via SSE events.
 * Returns a cleanup function.
 */
export function subscribeToWorldChanges(onChanged: () => void): () => void {
  let cancelled = false;

  async function listen() {
    try {
      const result = await subscribeToEvents();
      if (cancelled || !result) return;

      // The SDK returns an async iterable or event stream
      // We handle both SSE patterns the SDK may use
      const stream = result as unknown;
      if (stream && typeof stream === "object" && Symbol.asyncIterator in (stream as object)) {
        const iterable = stream as AsyncIterable<{ type?: string; file?: string }>;
        for await (const event of iterable) {
          if (cancelled) break;
          if (shouldRefresh(event)) {
            onChanged();
          }
        }
      }
    } catch {
      // Connection lost — retry after delay
      if (!cancelled) {
        setTimeout(listen, 5000);
      }
    }
  }

  listen();

  return () => {
    cancelled = true;
  };
}

function shouldRefresh(event: { type?: string; file?: string }): boolean {
  if (!event.type) return false;
  // Refetch when world files change or when the session goes idle (agent done)
  if (event.type === "file.watcher.updated" && event.file?.startsWith("world/")) return true;
  if (event.type === "session.idle") return true;
  return false;
}

/** Extract the value from a settled promise result, or return undefined. */
function settled<T>(result: PromiseSettledResult<T>): T | undefined {
  return result.status === "fulfilled" ? result.value : undefined;
}
