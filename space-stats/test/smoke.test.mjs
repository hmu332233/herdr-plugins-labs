import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("sync reports every workspace summary", async () => {
  const directory = await mkdtemp(join(tmpdir(), "space-stats-"));
  const reportLog = join(directory, "reports.jsonl");
  const fakeWorkspaceCommand = `
const fs = require("node:fs");
if (process.argv[2] === "list") {
  console.log(JSON.stringify({ result: { workspaces: [
    { workspace_id: "w1", tab_count: 3, pane_count: 5 },
    { workspace_id: "w2", tab_count: 1, pane_count: 2 }
  ] } }));
} else {
  fs.appendFileSync(process.env.REPORT_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");
}
`;
  const fakePaneCommand = `
console.log(JSON.stringify({ result: { panes: [
  { workspace_id: "w1", agent: "codex" },
  { workspace_id: "w1", agent: "claude" },
  { workspace_id: "w1" },
  { workspace_id: "w2", agent: "claude" },
  { workspace_id: "w2" }
] } }));
`;

  try {
    await writeFile(join(directory, "workspace"), fakeWorkspaceCommand);
    await writeFile(join(directory, "pane"), fakePaneCommand);
    const result = spawnSync(process.execPath, [join(pluginRoot, "src/sync.mjs")], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, HERDR_BIN_PATH: process.execPath, REPORT_LOG: reportLog },
    });
    assert.equal(result.status, 0, result.stderr);

    const reports = (await readFile(reportLog, "utf8")).trim().split("\n").map(JSON.parse);
    const tokens = reports.map((args) => args[args.indexOf("--token") + 1]);
    const sequences = reports.map((args) => args[args.indexOf("--seq") + 1]);
    assert.deepEqual(tokens, ["space_stats=3t(5p) · 2 agents", "space_stats=1t(2p) · 1 agent"]);
    assert.equal(new Set(sequences).size, 1);
    assert.match(sequences[0], /^\d+$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
