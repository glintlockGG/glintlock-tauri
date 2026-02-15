# Glintlock Plugin — Lifecycle & Command Architecture

*Reference document for the always-on campaign model. Intended to inform plugin development and dashboard design.*

---

## 1. The Always-On Campaign Model

Traditional TTRPG play is session-bounded: players meet, play for 3-4 hours, end the session, prep for next time. Glintlock abandons this model entirely.

**The campaign is always on.** The `world/` folder is the living world. The player enters it whenever they want — for 5 minutes or 5 hours — and leaves whenever they want. There is no "start session" or "end session" in the traditional sense. The world persists. Things happen off-screen. The player re-enters a world that moved without them.

**Mental model:** Think of the campaign folder not as a save file but as a place. The player visits it. While they're away, the world continues. When they return, they catch up on what happened and resume play.

### What This Changes

| Traditional Model | Always-On Model |
|---|---|
| Session prep before each session | Prep is a continuous background lifecycle |
| Session boundaries trigger state saves | State is updated in real-time during play |
| "Last time on..." recap at session start | `/resume` loads world state, delivers what changed |
| GM prepares encounters for tonight | GM maintains a rolling prep buffer, refreshed by world turns |
| Chronicle written after session ends | Prose accumulates in the background as play progresses |
| World is frozen between sessions | World advances on schedule via `/world-turn` |

---

## 2. Core Commands (Revised)

### `/glintlock:new-campaign`
**Replaces:** `/glintlock:new-session`
**Purpose:** One-time campaign creation. Character creation + world setup (Pale Reach press-play or session-zero custom). Creates the `world/` directory, all initial entity files, `world/CLAUDE.md` hot cache, and `world/calendar.md`.
**When:** Only once per campaign folder.

### `/glintlock:resume`
**Replaces:** `/glintlock:continue-session`
**Purpose:** The primary entry point for returning to play. This is the command the player runs every time they sit down.
**Flow:**
1. Load `world/CLAUDE.md` (hot cache — primary context)
2. Check time elapsed since last play (compare `world/calendar.md` last-played timestamp to system clock)
3. If a `/world-turn` hasn't run since last play → trigger a lightweight world advance (clocks tick, myth omens check, NPC moves evaluate)
4. If a `/world-turn` has run recently → load its results from `world/gm-notes.md`
5. Refresh `world/CLAUDE.md` with current state
6. Deliver a "since you were gone..." summary of world advances (if any)
7. Deliver a strong start or continuation hook — drop the player into something immediate
8. Wait for player input

**Key difference from old `continue-session`:** No heavy state loading sequence. The hot cache is the primary source. Drill into entity files only when mechanical precision is needed. The orientation is: "what changed?" not "reload everything."

### `/glintlock:world-turn`
**Purpose:** Advance the world. Can be run manually by the player or on a cron schedule.
**Flow:**
1. Read `world/CLAUDE.md`, `world/calendar.md`, `world/myths.md`, `world/clocks.md`, `world/quests.md`
2. Read all faction files (`world/factions/*.md`) and active NPC files (`world/npcs/*.md`)
3. Determine time elapsed since last world turn
4. **Advance calendar:** Step the in-game calendar forward by the appropriate amount
5. **Tick clocks:** Evaluate each clock's trigger condition against elapsed time and recent events. Tick segments where appropriate. If a clock completes, narrate the consequence and write it to the session log.
6. **Advance myth omens:** Check each myth's advancement triggers. Use an oracle roll (see §5) to determine if omens advance for ambiguous cases. Write omen changes to `world/myths.md`.
7. **Execute NPC/faction moves:** For each active faction and key NPC, determine what they do during this period. Use oracle rolls to resolve uncertain outcomes. Write results to entity files and session log with `[world-advance]` tags.
8. **Generate secrets and clues:** Based on the new world state, generate 3-5 new secrets with multiple discovery paths. These feed into the prep buffer.
9. **Refresh prep buffer:** Write `world/gm-notes.md` with: potential scenes (based on where threads are heading), encounter setups (use oracle tables), NPC moves for next play period, and the new secrets.
10. **Update hot cache:** Rewrite `world/CLAUDE.md` with current state.
11. **Append to session log:** All world-advance entries, marked with `[world-advance]` tags and the calendar date.

**Cron scheduling:** The player can add a cron job on their machine:
```bash
# Run a world turn every 6 hours
0 */6 * * * cd /path/to/campaign && claude --plugin-dir /path/to/glintlock -p "/glintlock:world-turn" --no-interactive
```

### `/glintlock:feedback`
**Purpose:** Player signals preferences to the GM. Writes directly to `world/CLAUDE.md`.
**Usage:** Free-form. The player types `/glintlock:feedback I prefer longer dungeon crawls over overland travel` or `/glintlock:feedback Less shopping, more combat` or `/glintlock:feedback That NPC voice was perfect, do more of that`.
**Flow:**
1. Parse the feedback into the appropriate CLAUDE.md table (Play Style, Narrative Patterns, or Player Character sections)
2. Read current CLAUDE.md, update the relevant table, write back
3. Acknowledge briefly — "Noted. I'll lean into that."

### `/glintlock:dashboard`
**Purpose:** Generate the companion app HTML. Reads all world state, assembles JSON, injects into template, writes to `world/dashboard.html`.
**Views:** Player (character sheet + vitals), GM Screen (prep notes, NPC combat stats, session tools), Campaign (overview, myths, factions, timeline), Media (chronicles, audiobooks).
**Key addition:** Calendar view integrated into Campaign. Analytics/stats view showing play patterns over time.

### `/glintlock:chronicle`
**Purpose:** Generate prose narrative from session log entries.
**Revised behavior:** Can run in background. When enough `[event]` entries accumulate (configurable threshold, default ~15-20), the GM automatically drafts a chapter to `world/chronicles/`. The player can also invoke explicitly.
**Future:** Could be triggered by the world-turn cycle or by a hook.

### `/glintlock:audiobook`
**Purpose:** Generate audio production from a chronicle chapter. Always player-triggered (costs real money via ElevenLabs API). No change from current behavior.

### `/glintlock:roll`
**Purpose:** Player-initiated dice roll. No change.

### `/glintlock:status`
**Purpose:** Quick character sheet display. No change, but consider deprecating in favor of the dashboard's Player view.

### `/glintlock:recap`
**Purpose:** Deep audit of full campaign state. Useful after long absences. No change.

### `/glintlock:generate-adventure`
**Purpose:** Generate and seed a new adventure. No change.

---

## 3. The GM's Mental Model — Hot Cache Architecture

The `world/CLAUDE.md` file is the GM's working memory. It replaces the old expertise YAML concept with a more natural, markdown-based approach that aligns with Claude Code plugin best practices.

### What CLAUDE.md Contains

| Section | Purpose | Updated When |
|---|---|---|
| Character | PC summary (name, class, level, HP, location) | After any PC state change |
| Play Style | Player preferences (tone, pacing, likes, dislikes) | Via `/feedback`, at end of play, during world turns |
| Player Character | Observed personality, social behavior, combat tactics | Accumulated over play |
| Narrative Patterns | What works / what to avoid | Accumulated over play |
| Rulings | Precedent-setting mechanical calls | When rulings are made |
| Active Threads | Current quests, hooks, unresolved situations | After any thread change |
| Myth Status | Current omen levels for all myths | After any omen change |
| World State | 1-3 sentence summary of where things stand | Every update cycle |
| Calendar | Current in-game date, season, notable upcoming events | Every update cycle |

### When CLAUDE.md Gets Updated

**During play (real-time):**
- PC state changes (HP, inventory, location)
- New rulings made
- Threads created, advanced, or resolved
- Myth omens advance
- Player gives feedback

**Between play (world turns):**
- World state paragraph rewritten
- Active threads updated with off-screen developments
- Myth omens advanced
- Calendar advanced
- New NPC/faction moves noted

**Key principle:** CLAUDE.md should never be stale. Every mechanism that changes world state should also update the hot cache. This ensures `/resume` always has accurate context without needing to re-read every entity file.

---

## 4. Hooks

### SessionStart Hook (Revised)

The SessionStart hook fires every time Claude Code initializes in the campaign directory. Its job is now:

1. **Inject SOUL.md** — Identity, values, voice. Always first in context.
2. **Inject CLAUDE.md** — Hot cache. Priority context for the GM.
3. **Check freshness:** Compare `world/calendar.md` last-world-turn timestamp to current system time. If stale (> configurable threshold, e.g., 6 hours), inject a note: "World turn may be needed. Consider running a lightweight advance before play begins."
4. **Inject recent session log** — Last 30 lines for immediate context.
5. **Inject GM notes** — `world/gm-notes.md` (the prep buffer) if it exists.

**What it does NOT do:** Heavy state loading. That's the plugin's auto-discovery job. The hook is for priority ordering and freshness checks.

### Potential Future Hooks

**PostMessage hook:** After each GM response, evaluate if the session log has enough new entries to trigger background chronicle generation. If threshold met, spawn a background agent to draft prose.

**PreToolUse hook:** Before any Write to entity files, also queue an update to CLAUDE.md. (This could be implemented in the agent prompt instead of as a literal hook.)

---

## 5. The Oracle System

The GM should not improvise all decisions. It should use structured randomness to create genuine surprise — for both the player and itself.

### Oracle Roll (Ironsworn-style)

A yes/no oracle that resolves uncertain questions. The GM sets the odds based on its judgment, then rolls to find out.

| Odds | Yes on... |
|---|---|
| Almost Certain | d100 ≤ 90 |
| Likely | d100 ≤ 75 |
| 50/50 | d100 ≤ 50 |
| Unlikely | d100 ≤ 25 |
| Nearly Impossible | d100 ≤ 10 |

**Implementation:** Add an `oracle_roll` mode to the existing `roll_oracle` MCP tool, or add a new `roll_oracle_yn` tool that takes `odds` (string) and returns yes/no with the raw roll.

**When the GM uses this:**
- NPC reactions when disposition is ambiguous
- Whether a faction succeeded at an off-screen goal during a world turn
- Whether weather changes, whether a rumor is true, whether the road is clear
- Any "would this happen?" question where the GM's judgment sets the probability but randomness decides the outcome

**Why this matters:** It prevents the GM from always choosing the most "interesting" or "dramatic" outcome. Sometimes the answer is no. Sometimes the goblins don't attack. Sometimes the weather is fine. This creates a world that feels real rather than narratively convenient.

### Oracle Tables (Existing)

The current `roll_oracle` tool with `engine/data/oracle-tables.json` handles procedural content generation — NPC names, creature activities, adventure names, encounter types. These remain essential for prep and during-play improvisation.

**Principle:** The GM should reach for an oracle table before inventing content. Roll first, interpret second. The interpretation is where the GM's creativity shines — taking a random result and weaving it into the fiction coherently. This produces better, more surprising content than pure generation.

---

## 6. Calendar & Time Tracking

### In-Game Calendar

A new file: `world/calendar.md`

```markdown
# Calendar

## Current Date
Day 14 of the Harvest Moon, Year 1

## Season
Late autumn. First frosts. Days shortening.

## Time of Day
Late afternoon (roughly 4 hours of daylight remaining)

## Notable Upcoming Events
- Full moon in 3 days (lycanthropes active, certain rituals possible)
- First snow expected within the week
- Market day in Thornwall in 2 days

## Recent Weather
Overcast, cold wind from the north. Ground frost each morning.

## Metadata
last_played: 2026-02-14T15:30:00Z
last_world_turn: 2026-02-14T12:00:00Z
real_time_ratio: 1:1
campaign_start_real: 2026-02-01T00:00:00Z
campaign_start_game: Day 1, Harvest Moon, Year 1
```

### Real-Time Tracking

The system clock is accessible via `date` in the terminal. The plugin can calculate elapsed real time between plays and map it to in-game time using the configured ratio.

**Default ratio:** 1 real day = 1 in-game day. This is adjustable per campaign.

**Implementation:** The `track_time` MCP tool can be extended, or a new `calendar` tool can be added that:
- Returns current in-game date/time (calculated from real time + ratio)
- Advances the calendar by a specified amount
- Checks for upcoming events
- Returns elapsed time since last play

**How this feeds into world turns:** When `/world-turn` runs, it calculates how many in-game days have passed since the last turn and simulates that many days of world activity. If 3 in-game days passed, 3 days of NPC moves, weather changes, clock ticks, and myth advancement occur.

### Player vs GM Calendar Views

**Player sees:** Current date, season, weather, known upcoming events (market days, festivals, appointments with NPCs), moon phase.

**GM sees:** Everything the player sees, plus: myth trigger dates, faction operation timelines, hidden clock completion estimates, encounter probability shifts, resource depletion projections.

---

## 7. Prep as Background Lifecycle

### The Prep Buffer: `world/gm-notes.md`

Replaces `world/session-prep.md`. No longer session-scoped — it's a living document the GM maintains and draws from continuously.

**Contents:**

```markdown
# GM Notes
*Last refreshed: Day 14, Harvest Moon — 2026-02-14*

## Strong Starts (2-3)
Ready-to-deploy opening hooks for whenever the player next enters play.
Refreshed each world turn. Used by /resume.

## Active Secrets (3-5)
Information the player hasn't discovered yet. Each secret has 2+ discovery
paths. Secrets migrate — deliver through whatever the player is doing now.
Unused secrets persist across play periods. New secrets generated each
world turn based on evolving campaign state.

## NPC Moves
What active NPCs and factions are doing right now. Updated each world turn
as NPCs act off-screen. When the player encounters an NPC, check here for
their current state, goals, and a ready line of dialogue.

## Potential Scenes (3-5)
Modular situations the GM can deploy when the fiction calls for them.
Each has a trigger, a complication, and a thread connection.

## Encounter Setups (2-3)
Pre-rolled encounters with environment, morale, and rewards.
Generated using oracle tables during world turns.

## Treasure (2-3)
Pre-rolled rewards. Context is a suggestion — place wherever fiction leads.

## Notes
Pacing observations, music ideas, callbacks to earlier events.
```

### When Prep Refreshes

- **During `/world-turn`:** Full refresh. New secrets based on world state, new NPC moves based on faction activity, new encounters rolled from oracle tables.
- **During `/resume`:** Lightweight check. If the prep buffer is fresh (world turn ran recently), use it as-is. If stale, run a quick refresh.
- **During play (optional):** If the player goes somewhere completely unexpected and the prep buffer has nothing relevant, the GM can do a mid-play refresh by reading relevant entity files and generating scene/encounter material on the fly. The oracle tables prevent this from being pure improvisation.

### Secrets & Clues Methodology (Core Technique)

This is the single most important prep technique. It comes from the Lazy GM tradition but applies perfectly to an always-on model:

1. **Secrets are not locations.** A secret about the cult's hideout can be learned from a captured cultist, a tavern rumor, a map in the library, tracks in the forest, or an NPC's slip of the tongue.
2. **Secrets migrate.** When the player investigates anything, the GM checks the secrets list and delivers relevant information through whatever the player is doing now.
3. **Secrets persist.** Undelivered secrets carry forward indefinitely. They don't expire with a session boundary.
4. **New secrets generate from world state.** Each world turn produces new secrets based on what factions are doing, what myths are stirring, and what consequences are unfolding.

---

## 8. Prose & Media Generation

### Prose (Chronicle) — Background Lifecycle

**Trigger:** When the session log accumulates ~15-20 `[event]` entries since the last chapter, the GM drafts a new chapter.

**Implementation options:**
- A PostMessage hook that counts log entries and spawns a background chronicle agent when threshold is met
- A check during `/world-turn` that generates prose if enough events accumulated
- The GM itself notices during play and drafts in a quiet moment

**Output:** `world/chronicles/chapter-{NN}-{slug}.md`

**Player experience:** They can open the dashboard's Media view at any time and read the story of their campaign as it's being written. The story grows alongside their play.

### Audiobook — Player-Triggered

No change. `/glintlock:audiobook` invokes the pipeline explicitly. Costs real ElevenLabs API credits. The player chooses when and which chapters to produce.

### TTS During Play — Real-Time Narration

The GM uses `tts_narrate` for dramatic moments during play — scene descriptions, NPC dialogue, combat narration. This is live immersion, not a recording. It happens naturally as part of the GM's response flow. No change to current behavior.

---

## 9. Future Architecture — Multi-Agent Living World

*This section describes the long-term vision. Not for immediate implementation, but it should inform architectural decisions now so we don't paint ourselves into corners.*

### The Vision

Multiple Claude Code instances, each running the Glintlock plugin, operate on the same `world/` folder. Each instance is configured to simulate a specific aspect of the world:

- **Faction agents:** One instance per major faction. It reads the faction file, evaluates goals, makes moves, writes results. Runs on a schedule.
- **NPC agents:** Key NPCs get their own agent that simulates their daily life, relationships, schemes. Could share an instance with their faction.
- **Environment agents:** Weather, seasonal changes, natural events. Reads the calendar, generates weather patterns, advances environmental clocks.
- **The GM agent:** The player-facing agent. It reads what all other agents have produced and uses it to run the campaign.

### Shared State via Git

For multi-agent operation (and multiplayer), the `world/` folder lives in a Git repository.

- Each agent commits its changes after a run
- Merge conflicts are rare (agents write to different files) but handled by Git's merge tools
- The player can `git pull` to get world updates before playing
- A public repo enables multiplayer: multiple players, each with their own Claude Code GM, playing in the same world
- Version history provides a complete audit trail of the world's evolution

### Notifications

A lightweight watcher process monitors the session log for `[world-advance]` entries. When new entries appear, it pushes notifications via:
- System notifications (macOS `osascript`, Linux `notify-send`)
- Telegram bot
- Email
- Push notification service (Pushover, ntfy, Gotify)

The player gets a message: "The Thornwall garrison has fallen back to the inner wall. The Hollow King's omen has reached level 4."

### Real-Time Ratio Implications

With a 1:1 real-to-game-time ratio and scheduled world turns, the campaign genuinely evolves in real time. A faction war that takes 2 weeks of game time takes 2 weeks of real time. The player experiences the campaign as an ongoing reality rather than a series of disconnected sessions.

This is the Gygax/Arneson vision realized: a world that exists independent of any player's presence in it.

---

## 10. Dashboard Requirements Summary

The companion app (static HTML, regenerated by `/glintlock:dashboard`) must display:

### Player View (Primary — Character Sheet + Vitals)
- Character name, ancestry, class, level
- HP bar, Armor, stat block (6 stats, 1-10 scale)
- Training (skills), class features, ancestry traits
- Inventory with gear slot tracking
- Spells (if applicable)
- Countdown dice (torches, rations, ammo) with visual die indicators
- Gold/silver/copper
- Current location with danger level badge
- Death clock (only if > 0)
- Active quest summary (compact)

### GM Screen View (Peek Behind the Screen)
- Full `world/gm-notes.md` content: strong starts, secrets, NPC moves, scenes, encounters, treasure
- NPC quick-reference grid with combat stats
- Difficulty reference table
- Recent session log entries
- World advance entries
- Myth omen tracks (visual, 0-6)
- Progress clocks (visual, segmented)
- Calendar with GM-only information (hidden events, faction timelines)

### Campaign Overview View
- Campaign name, setting, tone, premise
- Calendar (player-visible version) with season, weather, upcoming events
- Myth status (omen bars, 0-6)
- Faction overview (names, dispositions, goals)
- Quest tracker (active, developing, completed)
- Session timeline / event history
- World state summary
- Active threads

### Media View (Story & Audio)
- Chronicle chapter list with reading progress
- Prose reader (rendered markdown)
- Audio player for audiobook chapters
- Session transcript access (links to Claude Code transcripts)

### Analytics View (New)
- Play frequency (calendar heatmap or bar chart)
- Session duration patterns
- Combat vs exploration vs social ratio
- Dice roll history and distribution
- Character progression timeline (level, HP, gold over time)
- Most encountered NPCs
- Myth omen history (line chart over time)
- Player feedback log

### Persistent Elements (Always Visible)
- Left rail: character minicard (name, class, HP bar, armor, gold), icon navigation
- Bottom bar: countdown dice, active clocks (compact), current calendar date, danger level
- Or: integrated into left rail depending on final wireframe layout

---

## 11. Legal Safety Notes

### Terminology Equivalents Needed

The current system uses terminology from Shadowdark and Mythic Bastionland. For the public plugin, create original equivalents:

| Source Term | Source Game | Needs Replacement |
|---|---|---|
| Myth | Mythic Bastionland | Yes — consider: Omen, Portent, Blight, Doom, Stirring |
| Omen (as myth level) | Mythic Bastionland | Yes — consider: Dread, Threat Level, Harbinger |
| Countdown Dice | Shadowdark | Possibly — check if this is generic enough. Consider: Burning Die, Dwindling Die |
| Lazy GM / Six Elements | Return of the Lazy Dungeon Master | Framework is generic, but avoid using the "Lazy GM" name |

### Content We Can Reference for Design Patterns

- **Mythic Bastionland:** Sandbox structure, myth-site design, omen escalation pattern (adapt the structure, rename everything)
- **Ironsworn:** Oracle roll system (the mechanic is not copyrightable — odds + d100 is generic)
- **Dolmenwood / Land of Eam / Shadowdark Westmarch:** "Complete sandbox in a box" design philosophy
- **Ben Robbins' Westmarches:** Player-driven sandbox campaign structure, shared world principles
- **Keep on the Borderlands:** Classic sandbox layout — safe home base, surrounding wilderness with escalating danger

---

## 12. Implementation Priority

### Phase 1 — Core Always-On Loop
1. Rename commands (`new-campaign`, `resume`)
2. Implement `world/calendar.md` and time tracking
3. Refactor prep to `world/gm-notes.md` (sessionless prep buffer)
4. Add Ironsworn-style oracle roll to MCP tools
5. Revise SessionStart hook for freshness check
6. Implement `/feedback` command

### Phase 2 — World Turns
7. Implement `/world-turn` command
8. Cron job documentation and example scripts
9. Background chronicle generation (threshold-triggered)

### Phase 3 — Dashboard Redesign
10. App shell layout (wireframe → HTML)
11. Player view, GM screen view, Campaign view, Media view
12. Calendar integration
13. Analytics view (requires session metadata accumulation)

### Phase 4 — Living World
14. Multi-agent architecture documentation
15. Git-based shared state
16. Notification system
17. Faction/NPC agent templates
18. Real-time ratio configuration

### Phase 5 — Community & Media
19. Website integration (blog, actual play, media hosting)
20. Public world hosting (GitHub-based multiplayer)
21. Video/streaming production pipeline
