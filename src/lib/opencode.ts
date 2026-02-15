import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import type { OpencodeClient } from "@opencode-ai/sdk/v2/client";

const PLUGIN_DIR = "/Users/dakeobac/Coding/glintlock-opencode";

let client: OpencodeClient | null = null;
let currentPort: number | null = null;

/**
 * Initialize the OpenCode SDK client once we know the port.
 */
export function initClient(port: number): OpencodeClient {
  if (client && currentPort === port) return client;
  client = createOpencodeClient({
    baseUrl: `http://127.0.0.1:${port}`,
    directory: PLUGIN_DIR,
    throwOnError: false,
  });
  currentPort = port;
  return client;
}

export function getClient(): OpencodeClient {
  if (!client) throw new Error("OpenCode client not initialized — call initClient(port) first");
  return client;
}

/**
 * Create a new game session.
 */
export async function createSession(title = "Glintlock Session") {
  const c = getClient();
  const { data, error } = await c.session.create({
    directory: PLUGIN_DIR,
    title,
  });
  if (error) throw new Error(`Failed to create session: ${JSON.stringify(error)}`);
  return data;
}

/**
 * List existing sessions.
 */
export async function listSessions() {
  const c = getClient();
  const { data, error } = await c.session.list({ directory: PLUGIN_DIR });
  if (error) throw new Error(`Failed to list sessions: ${JSON.stringify(error)}`);
  return data ?? [];
}

/**
 * Send a message to the GM agent in a session.
 * Returns the assistant response (info + parts).
 */
export async function sendMessage(
  sessionID: string,
  text: string,
  onEvent?: (event: unknown) => void,
) {
  const c = getClient();
  const { data, error } = await c.session.prompt(
    {
      sessionID,
      directory: PLUGIN_DIR,
      parts: [{ type: "text", text }],
      // Model and agent will use whatever OpenCode has configured
      // via the glintlock-opencode plugin (opencode.json)
      model: { providerID: "", modelID: "" },
    },
    onEvent
      ? {
          onSseEvent: onEvent,
        }
      : undefined,
  );
  if (error) throw new Error(`Prompt failed: ${JSON.stringify(error)}`);
  return data;
}

/**
 * Subscribe to global events (session updates, messages, etc.)
 */
export async function subscribeToEvents() {
  const c = getClient();
  const result = await c.event.subscribe({ directory: PLUGIN_DIR });
  return result;
}
