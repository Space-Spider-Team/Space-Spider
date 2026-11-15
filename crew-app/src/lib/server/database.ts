import "server-only";

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
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
    ["demo-estimate", "SageCare demo estimate", "SageCare", "", "Illustrative sample data, not flight telemetry."],
    ["mixed-records", "Mixed record sources", "SageCare", "", "Each field retains its own source label where available."],
    ["legacy-migration", "Migrated browser data", "SageCare", "", "Imported once from this device's previous app storage."],
  ].forEach((row) => sourceInsert.run(...(row as [string, string, string, string, string])));

  globalDatabase.sageCareDb = db;
  return db;
}

export type StateDomain = "crew" | "monitoring" | "settings";

export function readStates(): Record<StateDomain, Record<string, unknown>> {
  const rows = openDatabase().prepare("SELECT profile_id, domain, payload_json FROM app_state").all();
  const result: Record<StateDomain, Record<string, unknown>> = {
    crew: {},
    monitoring: {},
    settings: {},
  };
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

export function writeStates(domain: StateDomain, states: Record<string, unknown>, sourceId: string) {
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

export function readNasaCache(queryKey: string): { payload: unknown; fetchedAt: string } | null {
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

export function writeNasaCache(queryKey: string, payload: unknown) {
  openDatabase().prepare(`
    INSERT INTO nasa_search_cache (query_key, payload_json, fetched_at, source_id)
    VALUES (?, ?, ?, 'nasa-osdr')
    ON CONFLICT(query_key) DO UPDATE SET
      payload_json = excluded.payload_json,
      fetched_at = excluded.fetched_at,
      source_id = excluded.source_id
  `).run(queryKey, JSON.stringify(payload), new Date().toISOString());
}

export function listSources(): Record<string, unknown>[] {
  return openDatabase().prepare(
    "SELECT id, name, publisher, url, access_note AS accessNote FROM data_sources ORDER BY publisher, name",
  ).all();
}
