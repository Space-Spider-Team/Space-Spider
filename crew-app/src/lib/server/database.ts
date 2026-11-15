import "server-only";

import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

type SqlValue = string | number | null;
type Statement = {
  run: (...values: SqlValue[]) => unknown;
  get: (...values: SqlValue[]) => Record<string, unknown> | undefined;
  all: (...values: SqlValue[]) => Record<string, unknown>[];
};
type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
};
type SqliteModule = { DatabaseSync: new (path: string) => SqliteDatabase };

const globalDatabase = globalThis as typeof globalThis & { sageCareDb?: SqliteDatabase };

type SupabaseConfig = { url: string; key: string; legacyJwtKey: boolean };
type SupabaseStateRow = { profile_id: string; domain: StateDomain; payload: unknown };
type SupabaseCacheRow = { payload: unknown; fetched_at: string };

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Set both SUPABASE_URL and SUPABASE_SECRET_KEY to enable Supabase storage.");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      throw new Error("SUPABASE_URL must use HTTPS.");
    }
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTPS project URL.");
  }
  return { url, key, legacyJwtKey: key.startsWith("eyJ") };
}

async function supabaseRequest<T>(table: string, params: URLSearchParams, init?: RequestInit): Promise<T> {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");
  const headers = new Headers(init?.headers);
  headers.set("apikey", config.key);
  if (config.legacyJwtKey) headers.set("Authorization", `Bearer ${config.key}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  const response = await fetch(`${config.url}/rest/v1/${table}?${params.toString()}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Supabase ${table} request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function emptyStates(): Record<StateDomain, Record<string, unknown>> {
  return { crew: {}, monitoring: {}, settings: {} };
}

function openDatabase(): SqliteDatabase {
  if (globalDatabase.sageCareDb) return globalDatabase.sageCareDb;

  const databasePath = process.env.SAGECARE_DB_PATH ?? join(process.cwd(), "data", "sagecare.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  const require = createRequire(join(process.cwd(), "package.json"));
  const { DatabaseSync } = require("node:sqlite") as SqliteModule;
  const db = new DatabaseSync(databasePath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      publisher TEXT NOT NULL,
      url TEXT NOT NULL,
      access_note TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
      profile_id TEXT NOT NULL,
      domain TEXT NOT NULL CHECK (domain IN ('crew', 'monitoring', 'settings')),
      payload_json TEXT NOT NULL,
      source_id TEXT NOT NULL REFERENCES data_sources(id),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (profile_id, domain)
    );

    CREATE TABLE IF NOT EXISTS nasa_search_cache (
      query_key TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      source_id TEXT NOT NULL REFERENCES data_sources(id)
    );
  `);

  const sourceInsert = db.prepare(`
    INSERT INTO data_sources (id, name, publisher, url, access_note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      publisher = excluded.publisher,
      url = excluded.url,
      access_note = excluded.access_note
  `);
  [
    ["nasa-osdr", "Open Science Data Repository", "NASA", "https://osdr.nasa.gov/bio/repo/", "Public study metadata; file access varies by study."],
    ["nasa-hrr", "Human Research Roadmap", "NASA", "https://humanresearchroadmap.nasa.gov/", "Public evidence reports and risk references."],
    ["usda-fdc", "FoodData Central", "USDA", "https://fdc.nal.usda.gov/", "Public food nutrient reference data."],
    ["crew-entry", "Crew-entered record", "SageCare", "", "Entered in this app; not independently verified."],
    ["provided-reference", "Provided nutrient reference", "SageCare", "", "Nutrient values supplied for this demo catalog."],
    ["demo-estimate", "SageCare demo estimate", "SageCare", "", "Illustrative sample data, not flight telemetry."],
    ["mixed-records", "Mixed record sources", "SageCare", "", "Each field retains its own source label where available."],
    ["legacy-migration", "Migrated browser data", "SageCare", "", "Imported once from this device's previous app storage."],
  ].forEach((row) => sourceInsert.run(...(row as [string, string, string, string, string])));

  globalDatabase.sageCareDb = db;
  return db;
}

function readLegacySqliteStates(): Record<StateDomain, Record<string, unknown>> {
  const databasePath = process.env.SAGECARE_DB_PATH ?? join(process.cwd(), "data", "sagecare.sqlite");
  return existsSync(databasePath) ? readStatesSqlite() : emptyStates();
}

export type StateDomain = "crew" | "monitoring" | "settings";

function readStatesSqlite(): Record<StateDomain, Record<string, unknown>> {
  const rows = openDatabase().prepare("SELECT profile_id, domain, payload_json FROM app_state").all();
  const result = emptyStates();
  for (const row of rows) {
    const domain = row.domain as StateDomain;
    if (!(domain in result) || typeof row.profile_id !== "string" || typeof row.payload_json !== "string") continue;
    try {
      result[domain][row.profile_id] = JSON.parse(row.payload_json) as unknown;
    } catch {
      // Ignore a corrupt row and keep the rest of the database available.
    }
  }
  return result;
}

export async function readStates(): Promise<Record<StateDomain, Record<string, unknown>>> {
  if (!supabaseConfig()) return readStatesSqlite();
  const rows = await supabaseRequest<SupabaseStateRow[]>("app_state", new URLSearchParams({
    select: "profile_id,domain,payload",
  }));
  const result = emptyStates();
  for (const row of rows) {
    if (!(row.domain in result) || typeof row.profile_id !== "string") continue;
    let payload = row.payload;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload) as unknown;
      } catch {
        continue;
      }
    }
    result[row.domain][row.profile_id] = payload;
  }

  // Bring forward the old local database on the first Supabase read, before clients save defaults.
  if (rows.length === 0) {
    const legacyStates = readLegacySqliteStates();
    for (const domain of ["crew", "monitoring", "settings"] as const) {
      const states = legacyStates[domain];
      if (Object.keys(states).length) {
        await writeStatesToSupabase(domain, states, "legacy-migration");
        result[domain] = states;
      }
    }
  }
  return result;
}

async function writeStatesToSupabase(domain: StateDomain, states: Record<string, unknown>, sourceId: string) {
  const entries = Object.entries(states);
  if (!entries.length) return;
  const timestamp = new Date().toISOString();
  const rows = entries.map(([profileId, payload]) => {
    const serialized = JSON.stringify(payload);
    if (serialized.length > 1_000_000) throw new Error("A saved record exceeds the 1 MB limit.");
    return { profile_id: profileId, domain, payload, source_id: sourceId, updated_at: timestamp };
  });
  await supabaseRequest<void>("app_state", new URLSearchParams({ on_conflict: "profile_id,domain" }), {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

export async function writeStates(domain: StateDomain, states: Record<string, unknown>, sourceId: string): Promise<void> {
  if (supabaseConfig()) {
    await writeStatesToSupabase(domain, states, sourceId);
    return;
  }
  const db = openDatabase();
  const write = db.prepare(`
    INSERT INTO app_state (profile_id, domain, payload_json, source_id, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(profile_id, domain) DO UPDATE SET
      payload_json = excluded.payload_json,
      source_id = excluded.source_id,
      updated_at = excluded.updated_at
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    const timestamp = new Date().toISOString();
    for (const [profileId, payload] of Object.entries(states)) {
      const serialized = JSON.stringify(payload);
      if (serialized.length > 1_000_000) throw new Error("A saved record exceeds the 1 MB limit.");
      write.run(profileId, domain, serialized, sourceId, timestamp);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function readNasaCache(queryKey: string): Promise<{ payload: unknown; fetchedAt: string } | null> {
  if (supabaseConfig()) {
    const rows = await supabaseRequest<SupabaseCacheRow[]>("nasa_search_cache", new URLSearchParams({
      select: "payload,fetched_at",
      query_key: `eq.${queryKey}`,
      limit: "1",
    }));
    const row = rows[0];
    return row ? { payload: row.payload, fetchedAt: row.fetched_at } : null;
  }
  const row = openDatabase().prepare(
    "SELECT payload_json, fetched_at FROM nasa_search_cache WHERE query_key = ?",
  ).get(queryKey);
  if (!row || typeof row.payload_json !== "string" || typeof row.fetched_at !== "string") return null;
  try {
    return { payload: JSON.parse(row.payload_json) as unknown, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

export async function writeNasaCache(queryKey: string, payload: unknown): Promise<void> {
  if (supabaseConfig()) {
    await supabaseRequest<void>("nasa_search_cache", new URLSearchParams({ on_conflict: "query_key" }), {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ query_key: queryKey, payload, fetched_at: new Date().toISOString(), source_id: "nasa-osdr" }),
    });
    return;
  }
  openDatabase().prepare(`
    INSERT INTO nasa_search_cache (query_key, payload_json, fetched_at, source_id)
    VALUES (?, ?, ?, 'nasa-osdr')
    ON CONFLICT(query_key) DO UPDATE SET
      payload_json = excluded.payload_json,
      fetched_at = excluded.fetched_at,
      source_id = excluded.source_id
  `).run(queryKey, JSON.stringify(payload), new Date().toISOString());
}

export async function listSources(): Promise<Record<string, unknown>[]> {
  if (supabaseConfig()) {
    const rows = await supabaseRequest<{ id: string; name: string; publisher: string; url: string; access_note: string }[]>(
      "data_sources",
      new URLSearchParams({ select: "id,name,publisher,url,access_note", order: "publisher.asc,name.asc" }),
    );
    return rows.map(({ access_note: accessNote, ...row }) => ({ ...row, accessNote }));
  }
  return openDatabase().prepare(
    "SELECT id, name, publisher, url, access_note AS accessNote FROM data_sources ORDER BY publisher, name",
  ).all();
}
