/**
 * Camelot Wheel mapping utility.
 *
 * Converts Spotify's numerical key (0–11, Pitch Class) and mode (0 = minor, 1 = major)
 * to the standard Camelot Wheel notation used by DJs (e.g., "8A", "11B").
 *
 * Pitch class reference (Spotify / standard):
 *  0 = C, 1 = C♯/D♭, 2 = D, 3 = D♯/E♭, 4 = E, 5 = F,
 *  6 = F♯/G♭, 7 = G, 8 = G♯/A♭, 9 = A, 10 = A♯/B♭, 11 = B
 *
 * Camelot suffix: "A" = minor, "B" = major
 */

const CAMELOT_MAJOR: Record<number, string> = {
  0: "8B",   // C major
  1: "3B",   // C♯/D♭ major
  2: "10B",  // D major
  3: "5B",   // D♯/E♭ major
  4: "12B",  // E major
  5: "7B",   // F major
  6: "2B",   // F♯/G♭ major
  7: "9B",   // G major
  8: "4B",   // G♯/A♭ major
  9: "11B",  // A major
  10: "6B",  // A♯/B♭ major
  11: "1B",  // B major
};

const CAMELOT_MINOR: Record<number, string> = {
  0: "5A",   // C minor
  1: "12A",  // C♯/D♭ minor
  2: "7A",   // D minor
  3: "2A",   // D♯/E♭ minor
  4: "9A",   // E minor
  5: "4A",   // F minor
  6: "11A",  // F♯/G♭ minor
  7: "6A",   // G minor
  8: "1A",   // G♯/A♭ minor
  9: "8A",   // A minor
  10: "3A",  // A♯/B♭ minor
  11: "10A", // B minor
};

/**
 * Maps Spotify key + mode integers to a Camelot Wheel notation string.
 *
 * @param key  Spotify pitch-class integer (0–11). Pass -1 if unknown.
 * @param mode Spotify mode integer: 1 = major, 0 = minor.
 * @returns    Camelot notation string (e.g., "8A", "11B") or "Unknown" if
 *             the key cannot be determined.
 */
export function toCamelot(key: number, mode: number): string {
  if (key < 0 || key > 11) return "Unknown";
  return mode === 1 ? CAMELOT_MAJOR[key] : CAMELOT_MINOR[key];
}

/** Human-readable key name (e.g., "A minor", "C♯ major"). */
export function toKeyName(key: number, mode: number): string {
  if (key < 0 || key > 11) return "Unknown";
  const PITCH_NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
  return `${PITCH_NAMES[key]} ${mode === 1 ? "major" : "minor"}`;
}
