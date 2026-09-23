import { spawnSync } from "node:child_process";

const herdr = process.env.HERDR_BIN_PATH || "herdr";
const source = "dev.minung.agent-pane-id";

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
  const agents = run(["agent", "list"]).result.agents;
  for (const agent of agents) {
    run(
      [
        "pane",
        "report-metadata",
        agent.pane_id,
        "--source",
        source,
        "--token",
        `pane_id=${agent.pane_id}`,
        "--token",
        `tab_id=${agent.tab_id}`,
      ],
      false,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
