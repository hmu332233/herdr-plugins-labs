import { spawnSync } from "node:child_process";
import process from "node:process";

const herdr = process.env.HERDR_BIN_PATH || "herdr";
const origin = process.env.AGENT_LAUNCHER_ORIGIN_PANE_ID;
const choices = [
  { agent: "codex", label: "Codex", direction: "right", row: 0, col: 0 },
  { agent: "codex", label: "Codex", direction: "down", row: 0, col: 1 },
  { agent: "claude", label: "Claude", direction: "right", row: 1, col: 0 },
  { agent: "claude", label: "Claude", direction: "down", row: 1, col: 1 },
];
let selected = 0;
let submitted = false;

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

function executable(agent) {
  const command = agent === "codex" ? (process.env.CODEX_BIN || "codex") : (process.env.CLAUDE_BIN || "claude");
  const result = spawnSync("which", [command], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return { command, available: result.status === 0 };
}

function inspectChoice(choice) {
  const status = executable(choice.agent);
  return { ...choice, ...status };
}

function selectFirstAvailable(statuses) {
  const first = statuses.findIndex((choice) => choice.available);
  return first === -1 ? 0 : first;
}

function render(statuses, message = "") {
  const geometry = getGeometry();
  const unavailable = [...new Set(statuses.filter((choice) => !choice.available).map((choice) => choice.command))];
  const content = [
    row("Agent Launcher", geometry),
    row("Choose an agent and direction", geometry),
    row(`${format(statuses[0], 0, geometry.cell)}${" ".repeat(geometry.gap)}${format(statuses[1], 1, geometry.cell)}`, geometry),
    row(`${format(statuses[2], 2, geometry.cell)}${" ".repeat(geometry.gap)}${format(statuses[3], 3, geometry.cell)}`, geometry),
    row("^v<> navigate  Enter launch  Esc cancel", geometry),
  ];
  if (geometry.rows >= 8) content.push(row(message || (unavailable.length ? `Unavailable: ${unavailable.join(", ")}` : ""), geometry));
  const lines = [
    `┌${"─".repeat(geometry.inner + 2)}┐`,
    ...content.slice(0, Math.max(0, geometry.rows - 2)),
    `└${"─".repeat(geometry.inner + 2)}┘`,
  ];
  process.stdout.write("\x1b[2J\x1b[H" + lines.join("\r\n"));
}

function getGeometry() {
  const cols = Number.isInteger(process.stdout.columns) && process.stdout.columns > 0 ? process.stdout.columns : 41;
  const rows = Number.isInteger(process.stdout.rows) && process.stdout.rows > 0 ? process.stdout.rows : 8;
  const inner = Math.max(0, cols - 4);
  const cell = Math.max(1, Math.floor((inner - 2) / 2));
  return {
    cols,
    rows,
    inner,
    cell,
    gap: 2,
    firstCellStart: 3,
    secondCellStart: 3 + cell + 2,
    choiceStartRow: 4,
  };
}

function row(text, geometry) {
  return `│ ${text.slice(0, geometry.inner).padEnd(geometry.inner)} │`;
}

function format(choice, index, cell) {
  const text = choice.available
    ? `${choice.label} ${choice.direction === "right" ? "->" : "v"}`
    : `${choice.label} ${choice.direction === "right" ? "->" : "v"} [off]`;
  const padded = text.slice(0, cell - 2).padEnd(cell - 2);
  return `${choice.available && index === selected ? "> " : "  "}${padded}`;
}

function close(code = 0) {
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdout.write("\x1b[?1006l\x1b[?1000l\x1b[?25h\x1b[2J\x1b[H");
  process.stdin.pause();
  process.exit(code);
}

function fail(message, statuses) {
  render(statuses, message);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    process.stdin.once("data", () => close(1));
  } else close(1);
}

function launch(statuses) {
  if (submitted) return;
  submitted = true;
  const choice = statuses[selected];
  if (!origin) return fail("Missing launch origin pane.", statuses);
  if (!choice.available) return fail(`${choice.command} is not installed.`, statuses);

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
    cli(["pane", "run", newPaneId, choice.command]);
    close(0);
  } catch (error) {
    fail(error.message, statuses);
  }
}

const statuses = choices.map(inspectChoice);
selected = selectFirstAvailable(statuses);
render(statuses);
process.stdout.write("\x1b[?1000h\x1b[?1006h\x1b[?25l");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");

function move(rowDelta, colDelta) {
  const row = Math.floor(selected / 2);
  const col = selected % 2;
  for (let step = 1; step <= choices.length; step += 1) {
    const nextRow = row + rowDelta * step;
    const nextCol = col + colDelta * step;
    if (nextRow < 0 || nextRow > 1 || nextCol < 0 || nextCol > 1) continue;
    const next = nextRow * 2 + nextCol;
    if (statuses[next].available) {
      selected = next;
      return;
    }
  }
}

function mouseClick(input, statuses) {
  const geometry = getGeometry();
  const match = input.match(/\x1b\[<([0-9]+);(\d+);(\d+)([mM])/);
  if (!match || match[1] !== "0") return false;
  const col = Number(match[2]);
  const row = Number(match[3]);
  if (row < geometry.choiceStartRow || row > geometry.choiceStartRow + 1) return false;
  const inFirstCell = col >= geometry.firstCellStart && col < geometry.firstCellStart + geometry.cell;
  const inSecondCell = col >= geometry.secondCellStart && col < geometry.secondCellStart + geometry.cell;
  if (!inFirstCell && !inSecondCell) return false;
  const index = (row - geometry.choiceStartRow) * 2 + (inSecondCell ? 1 : 0);
  if (!statuses[index].available) return true;
  selected = index;
  if (match[4] === "M") launch(statuses);
  return true;
}

process.stdin.on("data", (input) => {
  if (submitted) return;
  if (input.includes("\x1b")) {
    if (mouseClick(input, statuses)) return render(statuses);
    const arrows = [...input.matchAll(/\x1b\[([ABCD])/g)];
    for (const [, arrow] of arrows) {
      if (arrow === "A") move(-1, 0);
      else if (arrow === "B") move(1, 0);
      else if (arrow === "C") move(0, 1);
      else if (arrow === "D") move(0, -1);
    }
    if (!arrows.length && (input === "\x1b" || input.endsWith("\x1b"))) return close();
    if (input.includes("\r") || input.includes("\n")) return launch(statuses);
  } else if (input.includes("\r") || input.includes("\n")) return launch(statuses);
  render(statuses);
});
process.stdin.on("end", () => { if (!submitted) close(0); });
