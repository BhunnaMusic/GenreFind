import type { SpotifyAudioFeatures, SpotifyTrack } from "@/types/track";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

/** Fetch a Client-Credentials access token from Spotify. */
export async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    // Revalidate token cache every 55 minutes (tokens expire in 60 min)
    next: { revalidate: 3300 },
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

/** Search Spotify for tracks matching `query`. */
export async function searchSpotifyTracks(
  query: string,
  limit = 5
): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const params = new URLSearchParams({ q: query, type: "track", limit: String(limit) });

  const res = await fetch(`${SPOTIFY_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
  const data = await res.json();
  return (data.tracks?.items ?? []) as SpotifyTrack[];
}

/** Fetch audio features for a single track by Spotify track ID. */
export async function getSpotifyAudioFeatures(
  trackId: string
): Promise<SpotifyAudioFeatures | null> {
  const token = await getSpotifyToken();

  const res = await fetch(`${SPOTIFY_API_BASE}/audio-features/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Spotify audio-features failed: ${res.status}`);
  return (await res.json()) as SpotifyAudioFeatures;
}

/** Fetch full track details by Spotify track ID. */
export async function getSpotifyTrack(trackId: string): Promise<SpotifyTrack> {
  const token = await getSpotifyToken();

  const res = await fetch(`${SPOTIFY_API_BASE}/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Spotify track fetch failed: ${res.status}`);
  return (await res.json()) as SpotifyTrack;
}

/** Fetch up to `limit` track recommendations based on a seed track. */
export async function getSpotifyRecommendations(
  seedTrackId: string,
  targetKey: number,
  targetMode: number,
  targetTempo: number,
  limit = 5
): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const params = new URLSearchParams({
    seed_tracks: seedTrackId,
    target_key: String(targetKey),
    target_mode: String(targetMode),
    target_tempo: String(Math.round(targetTempo)),
    limit: String(limit),
  });

  const res = await fetch(`${SPOTIFY_API_BASE}/recommendations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Spotify recommendations failed: ${res.status}`);
  const data = await res.json();
  return (data.tracks ?? []) as SpotifyTrack[];
}
