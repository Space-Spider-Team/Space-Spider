import { connection } from "next/server";
import { readNasaCache, writeNasaCache } from "@/lib/server/database";

type NasaStudy = { accession: string; title: string; description: string; url: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeStudies(payload: unknown, query: string): NasaStudy[] {
  const root = asRecord(payload);
  if (!root) return [];
  const hits = asRecord(root.hits);
  const hitList = Array.isArray(hits?.hits) ? hits.hits : null;
  const fallbackRows = [root.results, root.data, root.items].find(Array.isArray);
  const rows: unknown[] = hitList ?? (Array.isArray(fallbackRows) ? fallbackRows : []);

  return rows.flatMap((value) => {
    const row = asRecord(value);
    if (!row) return [];
    const source = asRecord(row._source) ?? asRecord(row.source) ?? row;
    const accession = firstText(source, ["Accession", "accession", "Study Accession", "OSD Accession", "id"]);
    const title = firstText(source, ["Study Title", "title", "Title", "name"]);
    if (!accession && !title) return [];
    const description = firstText(source, ["Study Description", "description", "Summary", "abstract"]);
    const term = accession || title || query;
    return [{
      accession: accession || "NASA OSDR study",
      title: title || accession,
      description: description.slice(0, 420),
      url: `https://osdr.nasa.gov/bio/repo/search?q=${encodeURIComponent(term)}&data_source=cgene`,
    }];
  }).slice(0, 10);
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (query.length < 3) return Response.json({ error: "Enter at least 3 characters." }, { status: 400 });

  const queryKey = query.toLowerCase();
  const cached = readNasaCache(queryKey);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 6 * 60 * 60 * 1000) {
    return Response.json({ studies: cached.payload, fetchedAt: cached.fetchedAt, cached: true });
  }

  try {
    const endpoint = new URL("https://osdr.nasa.gov/osdr/data/search");
    endpoint.searchParams.set("term", query);
    endpoint.searchParams.set("from", "0");
    endpoint.searchParams.set("size", "10");
    endpoint.searchParams.set("type", "cgene");
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`NASA OSDR returned ${response.status}.`);
    const raw = await response.json() as unknown;
    const studies = normalizeStudies(raw, query);
    writeNasaCache(queryKey, studies);
    return Response.json({ studies, fetchedAt: new Date().toISOString(), cached: false });
  } catch (error) {
    if (cached) {
      return Response.json({ studies: cached.payload, fetchedAt: cached.fetchedAt, cached: true, stale: true });
    }
    const message = error instanceof Error ? error.message : "NASA OSDR is unavailable.";
    return Response.json({ error: message, studies: [] }, { status: 502 });
  }
}
