"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SpotifyTrack } from "@/types/track";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const tracks: SpotifyTrack[] = await res.json();
      setResults(tracks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    search(query);
  };

  const msToMin = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-16 bg-gray-950">
      {/* Header */}
      <header className="mb-12 text-center">
        <p className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-2">
          DJ Metadata Hub
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
          <span className="text-indigo-400">ID</span>entification<span className="text-indigo-400">Nation</span>
        </h1>
        <p className="mt-3 text-slate-400 text-sm max-w-sm mx-auto">
          BPM · Camelot Key · Energy · Lyrics · Backstory · Similar Tracks
        </p>
      </header>

      {/* Search */}
      <form onSubmit={handleSubmit} className="w-full max-w-xl mb-8">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-4 w-5 h-5 text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={handleInput}
            placeholder="Search artist, song, or ISRC…"
            autoFocus
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800 border border-slate-700
                       text-white placeholder-slate-500 text-sm focus:outline-none
                       focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition"
          />
          {loading && (
            <div className="absolute right-4 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <p className="mb-6 text-red-400 text-sm bg-red-900/20 border border-red-800 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ul className="w-full max-w-xl space-y-2">
          {results.map((track) => (
            <li key={track.id}>
              <button
                onClick={() => router.push(`/track/${track.id}`)}
                className="w-full flex items-center gap-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700
                           hover:border-indigo-500/60 hover:bg-slate-800 transition text-left group"
              >
                {/* Album art */}
                {track.album.images[2]?.url || track.album.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={track.album.images[2]?.url ?? track.album.images[0].url}
                    alt={track.album.name}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-700 shrink-0 flex items-center justify-center">
                    <MusicIcon className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition">
                    {track.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {track.artists.map((a) => a.name).join(", ")} ·{" "}
                    {track.album.name}
                  </p>
                </div>
                {/* Duration */}
                <span className="text-xs font-mono text-slate-500 shrink-0">
                  {msToMin(track.duration_ms)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && query.length > 0 && (
        <p className="text-slate-500 text-sm mt-4">No results found.</p>
      )}

      {/* Footer */}
      <footer className="mt-16 text-xs text-slate-600 text-center space-y-1">
        <p>Powered by Spotify · Supabase · YouTube · Musixmatch · Google Gemini</p>
      </footer>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
    </svg>
  );
}
