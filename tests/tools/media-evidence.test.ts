import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ exists: vi.fn(), probe: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: mocks.exists }));
vi.mock("node:util", () => ({ promisify: () => mocks.probe }));
import { probeMediaDurationSeconds } from "../../src/tools/media-evidence.js";

beforeEach(() => { vi.clearAllMocks(); mocks.exists.mockReturnValue(true); });

describe("physical media duration evidence", () => {
  it("probes an existing media file without shell interpolation", async () => {
    mocks.probe.mockResolvedValue({ stdout: "10.123456\n" });
    await expect(probeMediaDurationSeconds("/media/a $(command).mp4")).resolves.toBe(10.123456);
    expect(mocks.probe).toHaveBeenCalledWith("ffprobe", expect.arrayContaining(["/media/a $(command).mp4"]), expect.objectContaining({ timeout: 30000 }));
  });
  it.each(["", "N/A", "NaN", "Infinity", "0", "-4"])("returns unknown for invalid duration %s", async stdout => {
    mocks.probe.mockResolvedValue({ stdout });
    await expect(probeMediaDurationSeconds("/media/clip.mp4")).resolves.toBeNull();
  });
  it("returns unknown for missing media without running ffprobe", async () => {
    mocks.exists.mockReturnValue(false);
    await expect(probeMediaDurationSeconds("/missing.mp4")).resolves.toBeNull();
    await expect(probeMediaDurationSeconds("")).resolves.toBeNull();
    expect(mocks.probe).not.toHaveBeenCalled();
  });
  it("returns unknown when ffprobe is missing or fails", async () => {
    mocks.probe.mockRejectedValue(new Error("ENOENT"));
    await expect(probeMediaDurationSeconds("/media/clip.mp4")).resolves.toBeNull();
  });
});
