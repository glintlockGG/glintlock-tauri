# CLAUDE.md

## Overview

Glintlock Desktop — a Tauri desktop app providing a visual TTRPG frontend for Glintlock campaigns. It's a pure UI layer; all game logic lives in the [glintlock-opencode](https://github.com/glintlockGG/glintlock-opencode) plugin.

## Architecture

```
App launch → Tauri spawns `opencode serve` → Frontend connects via @opencode-ai/sdk → TTRPG UI
```

- **Tauri backend** (`src-tauri/`) — Spawns `opencode serve` as a child process, picks a free port, manages lifecycle.
- **React frontend** (`src/`) — Connects via `@opencode-ai/sdk/v2/client` to the local OpenCode server. Displays chat, quests, NPCs, session log.
- **OpenCode plugin** (`/Users/dakeobac/Coding/glintlock-opencode`) — The actual game engine. Contains agents, skills, commands, MCP tools. The Tauri app just talks to it via HTTP.

## Build Commands

```bash
# Dev mode (Tauri + Vite HMR)
cargo tauri dev

# Production build
cargo tauri build

# Frontend only (no Tauri)
npm run dev
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root layout — left rail, center workspace, right drawer, bottom bar |
| `src/lib/opencode.ts` | SDK client wrapper for OpenCode server |
| `src/components/ChatView.tsx` | Primary play interface |
| `src-tauri/src/lib.rs` | Rust backend — spawns OpenCode, exposes port |
| `src-tauri/tauri.conf.json` | Window config, app metadata |

## Design System

Uses the Glintlock dashboard design language:
- **Colors**: Deep navy surfaces (#0f1117), torchlight amber accent (#e8a44a)
- **Typography**: Cinzel (display), DM Sans (body), Crimson Pro (narrative)
- **Layout**: CSS Grid — 64px left rail, fluid center, 300px right drawer, 44px bottom bar

## Dependencies

- Rust toolchain (via rustup)
- Node.js 18+
- OpenCode CLI (`brew install anomalyco/tap/opencode`)
- The glintlock-opencode plugin at `/Users/dakeobac/Coding/glintlock-opencode`
