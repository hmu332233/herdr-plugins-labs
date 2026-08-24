import { spawnSync } from "node:child_process";
import process from "node:process";
import { restartAgent } from "./restart.mjs";

const herdr = process.env.HERDR_BIN_PATH || "herdr";
const origin = process.env.AGENT_RESTART_ORIGIN_PANE_ID;

function cli(args) {
  const result = spawnSync(herdr, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.error?.message || `herdr exited ${result.status}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

function anyKey() {
  if (process.stdin.readableEnded || !process.stdin.isTTY) return Promise.resolve();
  return new Promise((resolve) => {
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.setRawMode?.(false);
      process.stdin.pause();
      resolve();
    });
  });
}

function report(message) {
  process.stdout.write(`\r\x1b[2K${message}`);
}

try {
  if (!origin) throw new Error("Missing launch origin pane.");
  report("Checking the launch origin pane…");
  await restartAgent(origin, {
    getAgent: (pane) => cli(["agent", "get", pane]),
    processInfo: (pane) => cli(["pane", "process-info", "--pane", pane]),
    sendKeys: (pane, keys) => cli(["pane", "send-keys", pane, ...keys]),
    run: (pane, command) => cli(["pane", "run", pane, command]),
    focus: (pane) => cli(["agent", "focus", pane]),
    report,
  });
} catch (error) {
  process.stdout.write(`\n\nAgent Restart error: ${error.message}\n\nPress any key to close.`);
  await anyKey();
  process.exitCode = 1;
}
