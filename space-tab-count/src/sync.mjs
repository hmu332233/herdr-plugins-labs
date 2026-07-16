import { spawnSync } from "node:child_process";

const herdr = process.env.HERDR_BIN_PATH || "herdr";
const source = "dev.minung.space-tab-count";

function run(args, expectJson = true) {
  const result = spawnSync(herdr, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.error?.message || `herdr exited ${result.status}`);
  }
  return expectJson ? JSON.parse(result.stdout) : undefined;
}

try {
  const workspaces = run(["workspace", "list"]).result.workspaces;
  for (const workspace of workspaces) {
    run(
      [
        "workspace",
        "report-metadata",
        workspace.workspace_id,
        "--source",
        source,
        "--token",
        `tab_count=${workspace.tab_count}`,
      ],
      false,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
