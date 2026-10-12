import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const config = require(path.join(process.cwd(), "cep-plugin", "bridge-config.cjs")) as {
  directoryFromConfig: (text: string, hostPaths: string[]) => string | null;
  createBridgeConfig: (runtime: Record<string, unknown>) => { path: string; read: (hostPaths: string[]) => string | null };
};

const release = "/Applications/Adobe Premiere Pro 2026/Adobe Premiere Pro 2026.app";
const beta = "/Applications/Adobe Premiere Pro (Beta)/Adobe Premiere Pro (Beta).app";
const text = JSON.stringify({ bridgeDir: "/tmp/bts-captions-bridge", hostApp: release });

describe("CEP bridge config", () => {
  it("serves the configured folder only in the named host application", () => {
    expect(config.directoryFromConfig(text, [`${release}/Contents/MacOS/CEPHtmlEngine.app/Contents/MacOS/CEPHtmlEngine`]))
      .toBe("/tmp/bts-captions-bridge");
    expect(config.directoryFromConfig(text, [`file://${encodeURI(release)}/Contents/MacOS/Adobe%20Premiere%20Pro%202026`]))
      .toBe("/tmp/bts-captions-bridge");
    expect(config.directoryFromConfig(text, [`${beta}/Contents/MacOS/CEPHtmlEngine`])).toBeNull();
    expect(config.directoryFromConfig(text, [`${release} Copy/Contents/MacOS/x`])).toBeNull();
  });

  it("fails closed on malformed or incomplete configs", () => {
    const host = [`${release}/Contents/MacOS/x`];
    expect(config.directoryFromConfig("{", host)).toBeNull();
    expect(config.directoryFromConfig(JSON.stringify({ bridgeDir: "/tmp/x" }), host)).toBeNull();
    expect(config.directoryFromConfig(JSON.stringify({ bridgeDir: "relative", hostApp: release }), host)).toBeNull();
    expect(config.directoryFromConfig(JSON.stringify({ hostApp: release }), host)).toBeNull();
  });

  it("reads the file named by PREMIERE_MCP_BRIDGE_CONFIG, else the BTS-Prod default", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "bridge-config-"));
    try {
      const file = path.join(dir, "premiere-bridge.json");
      const runtime = (env: Record<string, string>) => ({ fs: require("node:fs"), path, os, process: { env } });
      expect(config.createBridgeConfig(runtime({})).path)
        .toBe(path.join(os.homedir(), "Library", "Application Support", "com.btsprod.app", "premiere-bridge.json"));
      const reader = config.createBridgeConfig(runtime({ PREMIERE_MCP_BRIDGE_CONFIG: file }));
      expect(reader.read([`${release}/x`])).toBeNull();
      writeFileSync(file, text);
      expect(reader.read([`${release}/x`])).toBe("/tmp/bts-captions-bridge");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
