import { createClient } from "@supabase/supabase-js";
import type { TrackRow } from "@/types/track";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** Browser-safe Supabase client (uses anon key). */
export const supabase = getSupabaseClient();

/**
 * Look up a cached track by its Spotify ID.
 * Returns null if no cached record exists.
 */
export async function getCachedTrack(spotifyId: string): Promise<TrackRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("tracks")
    .select("*")
    .eq("spotify_id", spotifyId)
    .maybeSingle();

  if (error) {
    console.error("Supabase getCachedTrack error:", error.message);
    return null;
  }
  return data ?? null;
}

/**
 * Upsert (insert or update) a track record in the cache.
 */
export async function upsertTrack(
  track: Omit<TrackRow, "id" | "created_at" | "updated_at">
): Promise<TrackRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("tracks")
    .upsert(track, { onConflict: "spotify_id" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Supabase upsertTrack error:", error.message);
    return null;
  }
  return data ?? null;
}
