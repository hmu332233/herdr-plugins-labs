import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("sync reports every agent pane and tab ID", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agent-pane-id-"));
  const reportLog = join(directory, "reports.jsonl");
  const fakeAgentCommand = `
console.log(JSON.stringify({ result: { agents: [
  { pane_id: "w1:p1", tab_id: "w1:t1" },
  { pane_id: "w2:p3", tab_id: "w2:t2" }
] } }));
`;
  const fakePaneCommand = `
require("node:fs").appendFileSync(process.env.REPORT_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");
`;

  try {
    await writeFile(join(directory, "agent"), fakeAgentCommand);
    await writeFile(join(directory, "pane"), fakePaneCommand);
    const result = spawnSync(process.execPath, [join(pluginRoot, "src/sync.mjs")], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, HERDR_BIN_PATH: process.execPath, REPORT_LOG: reportLog },
    });
    assert.equal(result.status, 0, result.stderr);
    const reports = (await readFile(reportLog, "utf8")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(
      reports.map((args) => [args[1], args.at(-3), args.at(-1)]),
      [
        ["w1:p1", "pane_id=w1:p1", "tab_id=w1:t1"],
        ["w2:p3", "pane_id=w2:p3", "tab_id=w2:t2"],
      ],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
