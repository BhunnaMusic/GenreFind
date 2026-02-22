/** Shape of a track row as stored in Supabase. */
export interface TrackRow {
  id: string;
  isrc: string | null;
  spotify_id: string;
  title: string;
  artist: string;
  album: string | null;
  album_art_url: string | null;
  duration_ms: number | null;
  bpm: number | null;
  key: number | null;
  mode: number | null;
  camelot: string | null;
  key_name: string | null;
  time_signature: number | null;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  genres: string[] | null;
  lyrics: string | null;
  lyric_meaning: string | null;
  backstory: string | null;
  youtube_id: string | null;
  similar_track_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

/** Spotify audio-features response subset. */
export interface SpotifyAudioFeatures {
  id: string;
  tempo: number;
  key: number;
  mode: number;
  energy: number;
  danceability: number;
  valence: number;
  time_signature: number;
}

/** Spotify track search result subset. */
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
    release_date: string;
  };
  external_ids: { isrc?: string };
  popularity: number;
  duration_ms: number;
}

/** Full track metadata displayed in the UI. */
export interface TrackMetadata {
  track: SpotifyTrack;
  audioFeatures: SpotifyAudioFeatures | null;
  camelot: string;
  keyName: string;
  energyPct: number | null;
  danceabilityPct: number | null;
  genres: string[];
  lyrics: string | null;
  lyricMeaning: string | null;
  backstory: string | null;
  youtubeId: string | null;
  similarTracks: SpotifyTrack[];
  fromCache: boolean;
}
