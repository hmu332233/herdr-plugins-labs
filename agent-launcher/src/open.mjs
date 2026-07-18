import { spawnSync } from "node:child_process";

const herdr = process.env.HERDR_BIN_PATH || "herdr";
const plugin = process.env.HERDR_PLUGIN_ID || "dev.minung.agent-launcher";
const origin = process.env.HERDR_PANE_ID;

if (!origin) {
  console.error("Agent Launcher: no launch origin pane was provided.");
  process.exitCode = 1;
} else {
  const result = spawnSync(herdr, [
    "plugin", "pane", "open",
    "--plugin", plugin,
    "--entrypoint", "launcher",
    "--placement", "popup",
    "--env", `AGENT_LAUNCHER_ORIGIN_PANE_ID=${origin}`,
    "--focus",
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  if (result.error || result.status !== 0) {
    console.error(result.stderr?.trim() || result.error?.message || `herdr exited ${result.status}`);
    process.exitCode = 1;
  }
}
