/**
 * GET /api/track/[id]
 *
 * Cache-first metadata aggregation endpoint.
 *
 * Flow:
 *   1. Check Supabase cache by Spotify track ID.
 *   2. If cached → return immediately.
 *   3. Else → fetch Spotify track + audio features,
 *             fetch YouTube fallback ID,
 *             fetch lyrics via Musixmatch,
 *             fetch backstory via Google Search Grounding,
 *             fetch similar tracks via Spotify Recommendations,
 *             store in Supabase cache,
 *             return aggregated metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSpotifyTrack, getSpotifyAudioFeatures, getSpotifyRecommendations } from "@/lib/spotify";
import { toCamelot, toKeyName } from "@/lib/camelot";
import { getCachedTrack, upsertTrack } from "@/lib/supabase";
import type { TrackMetadata, SpotifyTrack } from "@/types/track";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: spotifyId } = await params;

  try {
    // ── 1. Cache-First: check Supabase ─────────────────────────────────────
    const cached = await getCachedTrack(spotifyId);
    if (cached) {
      // Re-fetch full Spotify track object for album art / duration (not stored verbatim)
      const spotifyTrack = await getSpotifyTrack(spotifyId);
      const payload: TrackMetadata = {
        track: spotifyTrack,
        audioFeatures: cached.bpm
          ? {
              id: spotifyId,
              tempo: cached.bpm,
              key: cached.key ?? -1,
              mode: cached.mode ?? 0,
              energy: cached.energy != null ? cached.energy / 100 : 0,
              danceability: cached.danceability != null ? cached.danceability / 100 : 0,
              valence: cached.valence != null ? cached.valence / 100 : 0,
              time_signature: 4,
            }
          : null,
        camelot: cached.camelot ?? "Unknown",
        keyName: cached.key_name ?? "Unknown",
        energyPct: cached.energy,
        danceabilityPct: cached.danceability,
        genres: cached.genres ?? [],
        lyrics: cached.lyrics,
        lyricMeaning: cached.lyric_meaning,
        backstory: cached.backstory,
        youtubeId: cached.youtube_id,
        similarTracks: [],
        fromCache: true,
      };
      return NextResponse.json(payload);
    }

    // ── 2. Fetch Spotify track + audio features ─────────────────────────────
    const [spotifyTrack, audioFeatures] = await Promise.all([
      getSpotifyTrack(spotifyId),
      getSpotifyAudioFeatures(spotifyId),
    ]);

    const camelot = audioFeatures
      ? toCamelot(audioFeatures.key, audioFeatures.mode)
      : "Unknown";
    const keyName = audioFeatures
      ? toKeyName(audioFeatures.key, audioFeatures.mode)
      : "Unknown";

    const energyPct = audioFeatures ? Math.round(audioFeatures.energy * 100) : null;
    const danceabilityPct = audioFeatures
      ? Math.round(audioFeatures.danceability * 100)
      : null;
    const valencePct = audioFeatures
      ? Math.round(audioFeatures.valence * 100)
      : null;

    // ── 3. Similar tracks (Spotify Recommendations) ─────────────────────────
    let similarTracks: SpotifyTrack[] = [];
    if (audioFeatures) {
      try {
        similarTracks = await getSpotifyRecommendations(
          spotifyId,
          audioFeatures.key,
          audioFeatures.mode,
          audioFeatures.tempo
        );
      } catch {
        // Non-fatal — recommendations are best-effort
      }
    }

    // ── 4. YouTube fallback ID ──────────────────────────────────────────────
    const youtubeId = await fetchYouTubeFallback(
      spotifyTrack.artists[0]?.name ?? "",
      spotifyTrack.name
    );

    // ── 5. Lyrics (Musixmatch) ──────────────────────────────────────────────
    const lyrics = await fetchMusixmatchLyrics(
      spotifyTrack.artists[0]?.name ?? "",
      spotifyTrack.name,
      spotifyTrack.external_ids.isrc
    );

    // ── 6. Backstory + lyric meaning (Google Search Grounding) ─────────────
    const { backstory, lyricMeaning } = await fetchBackstoryAndMeaning(
      spotifyTrack.artists[0]?.name ?? "",
      spotifyTrack.name
    );

    // ── 7. Store in Supabase cache ──────────────────────────────────────────
    await upsertTrack({
      isrc: spotifyTrack.external_ids.isrc ?? null,
      spotify_id: spotifyId,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map((a) => a.name).join(", "),
      album: spotifyTrack.album.name,
      album_art_url: spotifyTrack.album.images[0]?.url ?? null,
      duration_ms: spotifyTrack.duration_ms,
      bpm: audioFeatures?.tempo ?? null,
      key: audioFeatures?.key ?? null,
      mode: audioFeatures?.mode ?? null,
      camelot: camelot !== "Unknown" ? camelot : null,
      key_name: keyName !== "Unknown" ? keyName : null,
      time_signature: audioFeatures?.time_signature ?? null,
      energy: energyPct,
      danceability: danceabilityPct,
      valence: valencePct,
      genres: [],
      lyrics,
      lyric_meaning: lyricMeaning,
      backstory,
      youtube_id: youtubeId,
      similar_track_ids: similarTracks.map((t) => t.id),
    });

    // ── 8. Respond ──────────────────────────────────────────────────────────
    const payload: TrackMetadata = {
      track: spotifyTrack,
      audioFeatures,
      camelot,
      keyName,
      energyPct,
      danceabilityPct,
      genres: [],
      lyrics,
      lyricMeaning,
      backstory,
      youtubeId,
      similarTracks,
      fromCache: false,
    };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Fetch the YouTube video ID for a track (YouTube Data API v3). */
async function fetchYouTubeFallback(
  artist: string,
  title: string
): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      part: "id",
      q: `${artist} ${title} official`,
      type: "video",
      maxResults: "1",
      key: apiKey,
    });
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.items?.[0]?.id?.videoId as string) ?? null;
  } catch {
    return null;
  }
}

/** Fetch lyrics from the Musixmatch API. */
async function fetchMusixmatchLyrics(
  artist: string,
  title: string,
  isrc?: string
): Promise<string | null> {
  const apiKey = process.env.MUSIXMATCH_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      q_artist: artist,
      q_track: title,
      ...(isrc ? { track_isrc: isrc } : {}),
    });
    const res = await fetch(
      `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?${params}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const body: string | undefined =
      data?.message?.body?.lyrics?.lyrics_body;
    return body ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch track backstory and lyric meaning using the Google Generative AI
 * API with Search Grounding enabled.
 *
 * Requires: GOOGLE_GEMINI_API_KEY environment variable.
 *
 * Uses the Gemini 2.0 `google_search` tool (Search Grounding) to ground
 * responses in real-time Google Search results.
 * Note: Gemini 2.0 models use `google_search`; Gemini 1.5 models use
 * `google_search_retrieval`.  Both are snake_case per the REST API spec.
 */
async function fetchBackstoryAndMeaning(
  artist: string,
  title: string
): Promise<{ backstory: string | null; lyricMeaning: string | null }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return { backstory: null, lyricMeaning: null };

  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  async function ask(prompt: string): Promise<string | null> {
    try {
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        // google_search is the Search Grounding tool for Gemini 2.0 models
        // (Gemini 1.5 uses google_search_retrieval instead)
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 512 },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return (
        (data.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? null
      );
    } catch {
      return null;
    }
  }

  const [backstory, lyricMeaning] = await Promise.all([
    ask(
      `In 3–5 sentences, describe the origin and production history of the song ` +
        `"${title}" by ${artist}. Focus on factual background: when it was made, ` +
        `who produced it, and any notable context around its creation or release.`
    ),
    ask(
      `In 3–5 sentences, explain the narrative intent and thematic meaning of ` +
        `the lyrics of "${title}" by ${artist}. What story or emotion is the ` +
        `artist conveying?`
    ),
  ]);

  return { backstory, lyricMeaning };
}
