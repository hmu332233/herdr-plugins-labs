import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;

test("open action captures only the launch origin pane", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agent-restart-open-"));
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
    assert.match(args, /--env AGENT_RESTART_ORIGIN_PANE_ID=w1:p1/);
    assert.doesNotMatch(args, /w1:wrong|--target-pane/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("open action fails without a launch origin pane", () => {
  const result = spawnSync(process.execPath, [join(root, "src/open.mjs")], {
    encoding: "utf8", env: { ...process.env, HERDR_PANE_ID: "", HERDR_ACTIVE_PANE_ID: "w1:wrong" },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /no launch origin pane/);
});
