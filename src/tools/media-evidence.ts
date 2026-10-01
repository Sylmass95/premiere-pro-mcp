import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * SEC FORK (#712 review): ProjectItem.getOutPoint() is an editable source Out
 * mark, not the media's physical duration — using it as a trim/slip cap would
 * reject legitimate edits past a user-set mark. The only honest bound comes
 * from the media itself: probe the file with ffprobe. Returns null when there
 * is no evidence (missing file, still image, unreadable duration) so callers
 * skip the upper-bound guard instead of guessing.
 */
export async function probeMediaDurationSeconds(mediaPath: string): Promise<number | null> {
  if (!mediaPath || !existsSync(mediaPath)) return null;
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", mediaPath],
      { timeout: 30_000, maxBuffer: 1024 * 1024 },
    );
    const duration = Number(String(stdout).trim());
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch {
    return null;
  }
}
