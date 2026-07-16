import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("sync reports every workspace tab count", async () => {
  const directory = await mkdtemp(join(tmpdir(), "space-tab-count-"));
  const reportLog = join(directory, "reports.jsonl");
  const fakeWorkspaceCommand = `
const fs = require("node:fs");
if (process.argv[2] === "list") {
  console.log(JSON.stringify({ result: { workspaces: [
    { workspace_id: "w1", tab_count: 1 },
    { workspace_id: "w2", tab_count: 3 }
  ] } }));
} else {
  fs.appendFileSync(process.env.REPORT_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");
}
`;

  try {
    await writeFile(join(directory, "workspace"), fakeWorkspaceCommand);
    const result = spawnSync(process.execPath, [join(pluginRoot, "src/sync.mjs")], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, HERDR_BIN_PATH: process.execPath, REPORT_LOG: reportLog },
    });
    assert.equal(result.status, 0, result.stderr);
    const reports = (await readFile(reportLog, "utf8")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(reports.map((args) => args.at(-1)), ["tab_count=1", "tab_count=3"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
