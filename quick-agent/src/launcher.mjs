import { spawnSync } from "node:child_process";
import process from "node:process";
import { chooseLaunch, launchChoices, promptClose } from "./chooser.mjs";

const herdr = process.env.HERDR_BIN_PATH || "herdr";
const origin = process.env.QUICK_AGENT_ORIGIN_PANE_ID;


function cli(args) {
  const result = spawnSync(herdr, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.error?.message || `herdr exited ${result.status}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

function value(data, ...paths) {
  for (const path of paths) {
    let current = data;
    for (const key of path) current = current?.[key];
    if (current !== undefined && current !== null && current !== "") return current;
  }
  return undefined;
}

async function fail(message) {
  process.stdout.write(`\nQuick Agent error: ${message}\n`);
  await promptClose();
  process.exit(1);
}

async function launch(choice) {
  process.stdout.write(`\nLaunching ${choice.agent === "codex" ? "Codex" : "Claude"} ${choice.direction === "right" ? "→ Right" : "↓ Down"}…\n`);
  if (!origin) return fail("Missing launch origin pane.");

  try {
    const pane = cli(["pane", "get", origin]);
    const paneData = value(pane, ["result", "pane"], ["pane"], ["result"]);
    const paneId = value(paneData, ["pane_id"], ["id"]);
    if (!paneId || paneId !== origin) throw new Error("Launch origin pane no longer exists.");
    const cwd = value(paneData, ["foreground_cwd"], ["cwd"]);
    if (!cwd) throw new Error("Could not determine launch origin working directory.");

    const split = cli(["pane", "split", origin, "--direction", choice.direction, "--ratio", "0.5", "--cwd", cwd, "--focus"]);
    const newPane = value(split, ["result", "pane"], ["pane"], ["result"]);
    const newPaneId = value(newPane, ["pane_id"], ["id"], ["new_pane_id"], ["created_pane_id"], ["result", "pane_id"]);
    if (!newPaneId) throw new Error("Herdr did not return the created pane ID.");
    cli(["pane", "run", newPaneId, choice.agent]);
  } catch (error) {
    await fail(error.message);
  }
}

const choice = await chooseLaunch(launchChoices);
if (choice) await launch(choice);
