"use client";

import { useState, type FormEvent } from "react";

type Study = { accession: string; title: string; description: string; url: string };

export function NasaDataCatalog() {
  const [query, setQuery] = useState("human spaceflight");
  const [studies, setStudies] = useState<Study[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim().length < 3) {
      setStatus("Enter 3 or more characters.");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/nasa/osdr?q=${encodeURIComponent(query.trim())}`);
      const result = await response.json() as { studies?: Study[]; error?: string; cached?: boolean };
      if (!response.ok) throw new Error(result.error ?? "NASA search failed.");
      setStudies(result.studies ?? []);
      setStatus(result.studies?.length
        ? `${result.studies.length} NASA studies${result.cached ? " · cached" : ""}`
        : "No studies found.");
    } catch (error) {
      setStudies([]);
      setStatus(error instanceof Error ? error.message : "NASA search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="nasa-catalog-title" className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="nasa-catalog-title" className="text-base font-semibold text-white">NASA research catalog</h3>
          <p className="mt-1 text-sm text-slate-400">Search NASA OSDR study metadata.</p>
        </div>
        <a href="https://osdr.nasa.gov/bio/repo/" target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky-300 underline underline-offset-2">
          NASA OSDR
        </a>
      </div>
      <form onSubmit={search} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="nasa-study-search">Search NASA studies</label>
        <input
          id="nasa-study-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={100}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none"
        />
        <button type="submit" disabled={loading} className="min-h-11 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 text-sm font-semibold text-sky-100 disabled:opacity-60">
          {loading ? "Searching…" : "Search studies"}
        </button>
      </form>
      {status ? <p role="status" className="mt-2 text-sm text-slate-300">{status}</p> : null}
      {studies.length ? (
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {studies.map((study, index) => (
            <li key={`${study.accession}-${index}`} className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3">
              <a href={study.url} target="_blank" rel="noreferrer" className="font-semibold text-sky-200 underline decoration-sky-400/40 underline-offset-2">
                {study.title}
              </a>
              <p className="mt-1 text-xs font-medium text-slate-400">{study.accession}</p>
              {study.description ? <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-300">{study.description}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-slate-500">
        NASA human datasets may be restricted. Search results are research metadata, not crew medical records.
      </p>
    </section>
  );
}
