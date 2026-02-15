import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type {
  CharacterData,
  NPCData,
  QuestData,
  LogEntry,
  MythEntry,
  ClockData,
  CalendarData,
  GMScreenData,
} from "../data/types";
import { fetchWorldState, subscribeToWorldChanges } from "./world-loader";

export interface WorldState {
  status: "empty" | "loading" | "loaded" | "error";
  character: CharacterData | null;
  npcs: NPCData[];
  quests: QuestData[];
  logEntries: LogEntry[];
  dooms: MythEntry[];
  clocks: ClockData[];
  calendar: CalendarData | null;
  gmNotes: GMScreenData | null;
  lastUpdated: number;
}

const INITIAL_STATE: WorldState = {
  status: "empty",
  character: null,
  npcs: [],
  quests: [],
  logEntries: [],
  dooms: [],
  clocks: [],
  calendar: null,
  gmNotes: null,
  lastUpdated: 0,
};

const WorldContext = createContext<WorldState>(INITIAL_STATE);

export function useWorldState(): WorldState {
  return useContext(WorldContext);
}

export function WorldProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorldState>(INITIAL_STATE);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchWorldState();
      setState(result);
    } catch {
      setState((prev) => ({ ...prev, status: "error" }));
    }
  }, []);

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(refresh, 500);
  }, [refresh]);

  // Initial fetch
  useEffect(() => {
    setState((prev) => ({ ...prev, status: "loading" }));
    refresh();
  }, [refresh]);

  // Subscribe to file changes
  useEffect(() => {
    const cleanup = subscribeToWorldChanges(debouncedRefresh);
    return () => { cleanup(); };
  }, [debouncedRefresh]);

  return (
    <WorldContext.Provider value={state}>
      {children}
    </WorldContext.Provider>
  );
}
