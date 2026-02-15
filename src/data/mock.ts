import type {
  MediaData,
  AnalyticsData,
} from "./types";

// Media and Analytics still use mock data — will be wired to world files in Phase 2

export const MEDIA: MediaData = {
  chronicles: [
    { title: "Chapter 1 \u2014 The Deserter\u2019s Road", detail: "Covers sessions 1-3 \u00B7 2,400 words", status: "read" },
    { title: "Chapter 2 \u2014 In progress...", detail: "Being written from recent events", status: "writing" },
  ],
};

export const ANALYTICS: AnalyticsData = {
  summary: [
    { value: 14, label: "Days Active" },
    { value: 8, label: "Play Sessions" },
    { value: 47, label: "Dice Rolls" },
    { value: 3, label: "NPCs Met" },
  ],
};
