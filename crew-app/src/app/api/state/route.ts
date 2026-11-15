import { connection } from "next/server";
import { PROFILES } from "@/lib/crew";
import { listSources, readStates, writeStates, type StateDomain } from "@/lib/server/database";

const profileIds = new Set(PROFILES.map((profile) => profile.id));
const appSettingsId = "__app__";

export async function GET() {
  await connection();
  try {
    const [states, sources] = await Promise.all([readStates(), listSources()]);
    return Response.json({ states, sources, storage: process.env.SUPABASE_URL ? "supabase" : "local" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read saved data.";
    return Response.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "State payload must be an object." }, { status: 400 });
  }
  const payload = body as { domain?: unknown; states?: unknown };
  if (!["crew", "monitoring", "settings"].includes(String(payload.domain))) {
    return Response.json({ error: "Unknown state domain." }, { status: 400 });
  }
  if (!payload.states || typeof payload.states !== "object" || Array.isArray(payload.states)) {
    return Response.json({ error: "State map must be an object." }, { status: 400 });
  }

  const domain = payload.domain as StateDomain;
  const states = payload.states as Record<string, unknown>;
  const allowedIds = domain === "settings" ? new Set([appSettingsId]) : profileIds;
  if (Object.keys(states).some((id) => !allowedIds.has(id))) {
    return Response.json({ error: "Unknown crew profile." }, { status: 400 });
  }
  if (domain === "settings") {
    const settings = states[appSettingsId];
    const activeProfileId = settings && typeof settings === "object"
      ? (settings as { activeProfileId?: unknown }).activeProfileId
      : null;
    if (typeof activeProfileId !== "string" || !profileIds.has(activeProfileId)) {
      return Response.json({ error: "Choose a valid crew profile." }, { status: 400 });
    }
  }

  try {
    const sourceId = domain === "settings" ? "crew-entry" : "mixed-records";
    await writeStates(domain, states, sourceId);
    return Response.json({
      saved: Object.keys(states).length,
      storage: process.env.SUPABASE_URL ? "supabase" : "local",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save state.";
    return Response.json({ error: message }, { status: 400 });
  }
}
