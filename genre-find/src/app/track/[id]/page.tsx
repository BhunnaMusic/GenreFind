"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { TrackMetadata, SpotifyTrack } from "@/types/track";

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<TrackMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/track/${id}`);
        if (!r.ok) throw new Error(`Failed to load metadata (${r.status})`);
        const d: TrackMetadata = await r.json();
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unknown error");
          setLoading(false);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <FullscreenSpinner />;
  if (error) return <FullscreenError message={error} onBack={() => router.push("/")} />;
  if (!data) return null;

  const { track, audioFeatures, camelot, keyName, energyPct, danceabilityPct, genres, lyrics, lyricMeaning, backstory, youtubeId, similarTracks, fromCache } = data;
  const albumArt = track.album.images[0]?.url;
  const artistName = track.artists.map((a) => a.name).join(", ");
  const msToMin = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white text-sm transition"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Back to search
      </button>

      {/* Hero */}
      <section className="flex flex-col md:flex-row gap-8 mb-10">
        {albumArt && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={albumArt}
            alt={track.album.name}
            className="w-48 h-48 rounded-2xl object-cover shadow-2xl shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-indigo-400 tracking-widest uppercase mb-1">
            {track.album.release_date?.slice(0, 4)} · {track.album.name}
            {fromCache && (
              <span className="ml-3 text-green-400">● cached</span>
            )}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-1">
            {track.name}
          </h1>
          <p className="text-lg text-slate-300 mb-4">{artistName}</p>

          {/* Tech badges */}
          <div className="flex flex-wrap gap-2">
            {audioFeatures && (
              <Badge color="indigo" label="BPM" value={Math.round(audioFeatures.tempo).toString()} />
            )}
            {camelot !== "Unknown" && (
              <Badge color="violet" label="Camelot" value={camelot} />
            )}
            {keyName !== "Unknown" && (
              <Badge color="purple" label="Key" value={keyName} />
            )}
            {energyPct !== null && (
              <Badge color="orange" label="Energy" value={`${energyPct}%`} />
            )}
            {danceabilityPct !== null && (
              <Badge color="pink" label="Danceability" value={`${danceabilityPct}%`} />
            )}
            <Badge color="slate" label="Duration" value={msToMin(track.duration_ms)} />
            {track.external_ids?.isrc && (
              <Badge color="slate" label="ISRC" value={track.external_ids.isrc} />
            )}
          </div>
        </div>
      </section>

      {/* Progress bars */}
      {(energyPct !== null || danceabilityPct !== null) && (
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {energyPct !== null && (
            <ProgressBar label="Energy" pct={energyPct} color="bg-orange-500" />
          )}
          {danceabilityPct !== null && (
            <ProgressBar label="Danceability" pct={danceabilityPct} color="bg-pink-500" />
          )}
        </section>
      )}

      {/* Genres */}
      {genres.length > 0 && (
        <section className="mb-8">
          <SectionHeading>Genres</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <span key={g} className="px-3 py-1 rounded-full bg-indigo-900/50 border border-indigo-700 text-indigo-200 text-xs font-medium">
                {g}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Similar Tracks */}
      {similarTracks.length > 0 && (
        <section className="mb-8">
          <SectionHeading>Similar Tracks</SectionHeading>
          <ul className="space-y-2">
            {similarTracks.map((st) => (
              <SimilarTrackRow key={st.id} track={st} onClick={() => router.push(`/track/${st.id}`)} />
            ))}
          </ul>
        </section>
      )}

      {/* YouTube embed */}
      {youtubeId && (
        <section className="mb-8">
          <SectionHeading>Video</SectionHeading>
          <div className="aspect-video rounded-xl overflow-hidden border border-slate-800">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {/* Backstory */}
      {backstory && (
        <section className="mb-8">
          <SectionHeading>Backstory</SectionHeading>
          <Card>{backstory}</Card>
        </section>
      )}

      {/* Lyric Meaning */}
      {lyricMeaning && (
        <section className="mb-8">
          <SectionHeading>Lyric Meaning</SectionHeading>
          <Card>{lyricMeaning}</Card>
        </section>
      )}

      {/* Lyrics */}
      {lyrics && (
        <section className="mb-8">
          <SectionHeading>Lyrics</SectionHeading>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
            {lyrics}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-900/60 border-indigo-700 text-indigo-200",
    violet: "bg-violet-900/60 border-violet-700 text-violet-200",
    purple: "bg-purple-900/60 border-purple-700 text-purple-200",
    orange: "bg-orange-900/60 border-orange-700 text-orange-200",
    pink: "bg-pink-900/60 border-pink-700 text-pink-200",
    slate: "bg-slate-800 border-slate-600 text-slate-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono ${colorMap[color] ?? colorMap.slate}`}>
      <span className="text-[10px] opacity-70 uppercase tracking-wider">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono tracking-widest text-indigo-400 uppercase mb-3 flex items-center gap-2">
      <span className="w-4 h-px bg-indigo-600" />
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 text-sm text-slate-300 leading-relaxed">
      {children}
    </div>
  );
}

function SimilarTrackRow({ track, onClick }: { track: SpotifyTrack; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700 hover:border-indigo-500/60 hover:bg-slate-800 transition text-left group"
      >
        {track.album.images[2]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.album.images[2].url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-700 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition">{track.name}</p>
          <p className="text-xs text-slate-400 truncate">{track.artists.map((a) => a.name).join(", ")}</p>
        </div>
      </button>
    </li>
  );
}

function FullscreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function FullscreenError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-center px-4">
      <p className="text-red-400 mb-4">{message}</p>
      <button onClick={onBack} className="text-indigo-400 hover:text-white text-sm transition">
        ← Back to search
      </button>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
