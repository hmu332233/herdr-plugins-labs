import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;

async function fixture({ mode = "ok", agents = ["codex", "claude"] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "agent-launcher-"));
  const log = join(dir, "calls.jsonl");
  const fake = join(dir, "herdr");
  await writeFile(fake, `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$LAUNCHER_LOG"
case "$1 $2" in
  "pane get")
    if [ "${mode}" = "origin-gone" ]; then
      echo '{"result":{"pane":{"pane_id":"w1:gone","cwd":"/fallback"}}}'
    elif [ "${mode}" = "fallback" ]; then
      echo '{"result":{"pane":{"pane_id":"w1:p1","cwd":"/fallback"}}}'
    else
      echo '{"result":{"pane":{"pane_id":"w1:p1","foreground_cwd":"/work/project","cwd":"/fallback"}}}'
    fi ;;
  "pane split") echo '{"result":{"pane":{"pane_id":"w1:p2"}}}' ;;
  "pane run")
    if [ "${mode}" = "post-split-failure" ]; then exit 7; fi
    echo '{}' ;;
  *) echo '{}' ;;
esac
`);
  const commands = [fake, ...agents.map((agent) => join(dir, agent))];
  for (const command of commands) await writeFile(command, command === fake ? await readFile(command) : "#!/bin/sh\nexit 0\n");
  assert.equal(spawnSync("chmod", ["+x", ...commands]).status, 0);
  return { dir, fake, log, env: { ...process.env, PATH: `${dir}:/usr/bin:/bin`, HERDR_BIN_PATH: fake, AGENT_LAUNCHER_ORIGIN_PANE_ID: "w1:p1", LAUNCHER_LOG: log } };
}

async function runLauncher(input, options) {
  const result = spawnSync(process.execPath, [join(root, "src/launcher.mjs")], { cwd: options.dir, input, encoding: "utf8", env: options.env });
  const calls = await readFile(options.log, "utf8").then((text) => text.trim() ? text.trim().split("\n") : []).catch(() => []);
  return { result, calls };
}

test("launcher covers all four agent and direction combinations", async () => {
  const inputs = ["", "\x1b[C", "\x1b[B", "\x1b[B\x1b[C"];
  const expected = ["codex", "codex", "claude", "claude"];
  const directions = ["right", "down", "right", "down"];
  for (let index = 0; index < inputs.length; index += 1) {
    const options = await fixture();
    try {
      const { result, calls } = await runLauncher(`${inputs[index]}\r`, options);
      assert.equal(result.status, 0, result.stderr);
      assert.match(calls[1], new RegExp(`--direction ${directions[index]}`));
      assert.match(calls[2], new RegExp(`pane run w1:p2 ${expected[index]}`));
    } finally {
      await rm(options.dir, { recursive: true, force: true });
    }
  }
});

test("launcher selects the first available agent and skips disabled choices", async () => {
  const unavailableFirst = await fixture({ agents: ["claude"] });
  try {
    const { result, calls } = await runLauncher("\r", unavailableFirst);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Codex .*\[off\]/);
    assert.match(calls[2], /pane run w1:p2 claude/);
  } finally {
    await rm(unavailableFirst.dir, { recursive: true, force: true });
  }

  const skipDisabled = await fixture({ agents: ["codex"] });
  try {
    const { result, calls } = await runLauncher("\x1b[B\r", skipDisabled);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(calls.filter((call) => call.startsWith("pane split")).length, 1);
    assert.match(calls[2], /pane run w1:p2 codex/);
  } finally {
    await rm(skipDisabled.dir, { recursive: true, force: true });
  }
});

test("keyboard Esc, mouse click, and duplicate Enter are safe", async () => {
  const cancelled = await fixture();
  try {
    const { result, calls } = await runLauncher("\x1b", cancelled);
    assert.equal(result.status, 0);
    assert.equal(calls.length, 0);
    const ansiFree = result.stdout.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
    const renderedLines = ansiFree.replaceAll("\r", "").split("\n").filter(Boolean);
    assert.ok(renderedLines.length > 0);
    assert.ok(renderedLines.every((line) => [...line].length === 41), renderedLines.join("\n"));
    assert.ok(renderedLines.length <= 8, "render fits the fallback PTY height");
    assert.equal(ansiFree.endsWith("\r\n"), false, "render has no trailing CRLF");
    assert.ok(ansiFree.split("\n").slice(0, -1).every((line) => line.endsWith("\r")), "render lines use CRLF");
  } finally {
    await rm(cancelled.dir, { recursive: true, force: true });
  }

  const mouse = await fixture();
  try {
    const { result, calls } = await runLauncher("\x1b[<0;5;4M", mouse);
    assert.equal(result.status, 0, result.stderr);
    assert.match(calls[2], /pane run w1:p2 codex/);
  } finally {
    await rm(mouse.dir, { recursive: true, force: true });
  }

  const duplicate = await fixture();
  try {
    const { result, calls } = await runLauncher("\r\r", duplicate);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(calls.filter((call) => call.startsWith("pane split")).length, 1);
  } finally {
    await rm(duplicate.dir, { recursive: true, force: true });
  }
});

test("launcher uses foreground cwd, then pane cwd fallback", async () => {
  for (const [mode, cwd] of [["ok", "/work/project"], ["fallback", "/fallback"]]) {
    const options = await fixture({ mode });
    try {
      const { result, calls } = await runLauncher("\r", options);
      assert.equal(result.status, 0, result.stderr);
      assert.match(calls[1], new RegExp(`--cwd ${cwd}`));
    } finally {
      await rm(options.dir, { recursive: true, force: true });
    }
  }
});

test("disappeared origin and post-split failure are reported without retargeting or cleanup", async () => {
  for (const mode of ["origin-gone", "post-split-failure"]) {
    const options = await fixture({ mode });
    try {
      const { result, calls } = await runLauncher("\r", options);
      assert.notEqual(result.status, 0);
      if (mode === "origin-gone") {
        assert.match(result.stdout, /origin pane no longer exists/);
        assert.equal(calls.some((call) => call.startsWith("pane split")), false);
      } else {
        assert.equal(calls.some((call) => call.startsWith("pane split")), true);
        assert.match(result.stdout, /exited 7/);
        assert.equal(calls.some((call) => call.startsWith("pane close")), false);
      }
    } finally {
      await rm(options.dir, { recursive: true, force: true });
    }
  }
});

test("open action uses popup, only HERDR_PANE_ID, and passes origin through env", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agent-launcher-open-"));
  const log = join(dir, "open.log");
  const fake = join(dir, "herdr");
  await writeFile(fake, "#!/bin/sh\nprintf '%s\\n' \"$*\" > \"$OPEN_LOG\"\n");
  assert.equal(spawnSync("chmod", ["+x", fake]).status, 0);
  try {
    const result = spawnSync(process.execPath, [join(root, "src/open.mjs")], {
      encoding: "utf8",
      env: { ...process.env, HERDR_BIN_PATH: fake, HERDR_PANE_ID: "w1:p1", HERDR_ACTIVE_PANE_ID: "w1:wrong", OPEN_LOG: log },
    });
    assert.equal(result.status, 0, result.stderr);
    const args = await readFile(log, "utf8");
    assert.match(args, /--placement popup/);
    assert.match(args, /--env AGENT_LAUNCHER_ORIGIN_PANE_ID=w1:p1/);
    assert.doesNotMatch(args, /--target-pane/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("open action refuses to launch without an explicit origin pane", () => {
  const result = spawnSync(process.execPath, [join(root, "src/open.mjs")], { encoding: "utf8", env: { ...process.env, HERDR_BIN_PATH: "/does/not/exist", HERDR_ACTIVE_PANE_ID: "", HERDR_PANE_ID: "" } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no launch origin pane/);
});
