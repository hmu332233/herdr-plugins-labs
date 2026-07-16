import { spawnSync } from "node:child_process";

const herdr = process.env.HERDR_BIN_PATH || "herdr";
const source = "dev.minung.space-stats";
const sequence = process.hrtime.bigint().toString();

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
  const panes = run(["pane", "list"]).result.panes;
  const agentCounts = new Map();

  for (const pane of panes) {
    if (pane.agent) {
      agentCounts.set(pane.workspace_id, (agentCounts.get(pane.workspace_id) || 0) + 1);
    }
  }

  for (const workspace of workspaces) {
    const agentCount = agentCounts.get(workspace.workspace_id) || 0;
    const agents = `${agentCount} ${agentCount === 1 ? "agent" : "agents"}`;
    run(
      [
        "workspace",
        "report-metadata",
        workspace.workspace_id,
        "--source",
        source,
        "--token",
        `space_stats=${workspace.tab_count}t(${workspace.pane_count}p) · ${agents}`,
        "--seq",
        sequence,
      ],
      false,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
