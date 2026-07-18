import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;

async function fixture({ mode = "ok" } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "quick-agent-"));
  const log = join(dir, "calls.jsonl");
  const fake = join(dir, "herdr");
  await writeFile(fake, `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$QUICK_AGENT_LOG"
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
  assert.equal(spawnSync("chmod", ["+x", fake]).status, 0);
  return {
    dir,
    fake,
    log,
    env: {
      ...process.env,
      HERDR_BIN_PATH: fake,
      QUICK_AGENT_ORIGIN_PANE_ID: "w1:p1",
      QUICK_AGENT_LOG: log,
    },
  };
}

async function runLauncher(input, options) {
  const result = spawnSync(process.execPath, [join(root, "src/launcher.mjs")], {
    cwd: options.dir,
    input,
    encoding: "utf8",
    env: options.env,
  });
  const calls = await readFile(options.log, "utf8").then((text) => text.trim() ? text.trim().split("\n") : []).catch(() => []);
  return { result, calls };
}

test("launcher covers all four agent and direction combinations", async () => {
  const inputs = ["", "\x1b[B", "\x1b[B\x1b[B", "\x1b[B\x1b[B\x1b[B"];
  const expected = ["codex", "codex", "claude", "claude"];
  const directions = ["right", "down", "right", "down"];
  for (let index = 0; index < inputs.length; index += 1) {
    const options = await fixture();
    try {
      const { result, calls } = await runLauncher(`${inputs[index]}\r`, options);
      assert.equal(result.status, 0, result.stderr);
      assert.match(calls[1], new RegExp(`--direction ${directions[index]}`));
      assert.match(calls[2], new RegExp(`pane run w1:p2 ${expected[index]}`));
      assert.match(result.stdout, new RegExp(`Launching ${expected[index] === "codex" ? "Codex" : "Claude"} ${directions[index] === "right" ? "→ Right" : "↓ Down"}`));
    } finally {
      await rm(options.dir, { recursive: true, force: true });
    }
  }
});

test("Esc and Ctrl+C cancel without Herdr calls or stack traces", async () => {
  for (const input of ["\x1b", "\x03"]) {
    const options = await fixture();
    try {
      const { result, calls } = await runLauncher(input, options);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(calls.length, 0);
      assert.doesNotMatch(result.stderr, /Error|at /);
    } finally {
      await rm(options.dir, { recursive: true, force: true });
    }
  }
});

test("launcher ignores duplicate Enter after one submission", async () => {
  const options = await fixture();
  try {
    const { result, calls } = await runLauncher("\r\r", options);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(calls.filter((call) => call.startsWith("pane split")).length, 1);
  } finally {
    await rm(options.dir, { recursive: true, force: true });
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

test("disappeared origin and post-split failure wait for dismissal without retargeting or cleanup", async () => {
  for (const mode of ["origin-gone", "post-split-failure"]) {
    const options = await fixture({ mode });
    try {
      const { result, calls } = await runLauncher("\r\r", options);
      assert.equal(result.status, 1);
      assert.equal(result.stderr, "");
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

test("error state dismisses on Esc while stdin stays open", async () => {
  const options = await fixture({ mode: "origin-gone" });
  const child = spawn(process.execPath, [join(root, "src/launcher.mjs")], { cwd: options.dir, env: options.env });
  const killTimer = setTimeout(() => child.kill(), 8000);
  try {
    let out = "";
    let err = "";
    child.stderr.on("data", (chunk) => { err += chunk; });
    const exited = new Promise((resolve) => child.once("exit", resolve));
    const seen = (text) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${JSON.stringify(text)} in:\n${out}\n${err}`)), 5000);
      const check = (chunk) => {
        if (chunk) out += chunk;
        if (out.includes(text)) {
          clearTimeout(timer);
          child.stdout.off("data", check);
          resolve();
        }
      };
      child.stdout.on("data", check);
      check();
    });
    await seen("Choose an agent");
    child.stdin.write("\r");
    await seen("Press Enter or Esc to close");
    child.stdin.write("\x1b");
    assert.equal(await exited, 1, err);
    assert.equal(err, "");
  } finally {
    clearTimeout(killTimer);
    await rm(options.dir, { recursive: true, force: true });
  }
});

test("open action uses popup, only HERDR_PANE_ID, and passes origin through env", async () => {
  const dir = await mkdtemp(join(tmpdir(), "quick-agent-open-"));
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
    assert.match(args, /--env QUICK_AGENT_ORIGIN_PANE_ID=w1:p1/);
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
