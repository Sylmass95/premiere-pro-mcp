(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MCPBridgeConfig = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // BTS-Prod writes this file so the connector also serves its private bridge
  // folder however Premiere was launched (Dock, Creative Cloud, open -a).
  var CONFIG_RELATIVE_PATH = ["Library", "Application Support", "com.btsprod.app", "premiere-bridge.json"];

  function configPath(runtime) {
    var env = (runtime.process && runtime.process.env) || {};
    if (typeof env.PREMIERE_MCP_BRIDGE_CONFIG === "string" && env.PREMIERE_MCP_BRIDGE_CONFIG.trim()) {
      return env.PREMIERE_MCP_BRIDGE_CONFIG.trim();
    }
    return runtime.path.join.apply(runtime.path, [runtime.os.homedir()].concat(CONFIG_RELATIVE_PATH));
  }

  function normalizeHostPath(value) {
    if (typeof value !== "string" || !value) return "";
    var p = value.replace(/^file:\/\//, "");
    try {
      p = decodeURIComponent(p);
    } catch (e) {}
    return p.replace(/\/+$/, "");
  }

  function hostMatches(hostApp, hostPaths) {
    var want = normalizeHostPath(hostApp);
    if (!want) return false;
    for (var i = 0; i < hostPaths.length; i++) {
      var have = normalizeHostPath(hostPaths[i]);
      if (have && (have === want || have.indexOf(want + "/") === 0)) return true;
    }
    return false;
  }

  /**
   * Bridge folder named by the config, only for the host application it names
   * (`hostApp`, an absolute `.app` path): another Premiere install, such as the
   * Beta, never picks it up. Fails closed on any missing or malformed field.
   */
  function directoryFromConfig(text, hostPaths) {
    var config;
    try {
      config = JSON.parse(text);
    } catch (e) {
      return null;
    }
    if (!config || typeof config.bridgeDir !== "string" || !config.bridgeDir.trim()) return null;
    if (config.bridgeDir.trim().charAt(0) !== "/" && !/^[A-Za-z]:[\\/]/.test(config.bridgeDir.trim())) return null;
    if (!hostMatches(config.hostApp, hostPaths || [])) return null;
    return config.bridgeDir.trim();
  }

  function createBridgeConfig(runtime) {
    var file = configPath(runtime);
    return {
      path: file,
      read: function (hostPaths) {
        try {
          if (!runtime.fs.existsSync(file)) return null;
          return directoryFromConfig(runtime.fs.readFileSync(file, "utf-8"), hostPaths);
        } catch (e) {
          return null;
        }
      },
    };
  }

  return {
    createBridgeConfig: createBridgeConfig,
    directoryFromConfig: directoryFromConfig,
    hostMatches: hostMatches,
  };
}));
