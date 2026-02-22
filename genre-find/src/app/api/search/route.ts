/**
 * GET /api/search?q=<query>
 *
 * Searches Spotify for tracks matching the query string.
 * Returns an array of up to 8 SpotifyTrack objects.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchSpotifyTracks } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  try {
    const tracks = await searchSpotifyTracks(q, 8);
    return NextResponse.json(tracks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
