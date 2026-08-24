const STOP_TIMEOUT_MS = 5_000;

export function foreground(info) {
  const processInfo = info?.result?.process_info;
  return (processInfo?.foreground_processes ?? []).filter((process) => process.pid !== processInfo?.shell_pid);
}

export function resumeCommand(agent, processes) {
  // argv 폴백은 이전에 resume된 Codex용. Claude는 Herdr가 세션 ID를 항상 재보고하므로 폴백이 필요 없다.
  const argvId = processes.flatMap((process) => {
    const argv = process.argv ?? [];
    const index = argv.indexOf("resume");
    return index > 0 && argv[index + 1] ? [argv[index + 1]] : [];
  })[0];
  const sessionId = agent.agent_session?.value || argvId;
  if (!sessionId) throw new Error(`The ${agent.agent} agent did not report a session ID.`);
  return agent.agent === "codex" ? `codex resume ${sessionId}` : `claude --resume ${sessionId}`;
}

export async function restartAgent(origin, operations) {
  const {
    getAgent, processInfo, sendKeys, run, focus, report = () => {}, now = Date.now,
    sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  } = operations;

  const agent = (await getAgent(origin))?.result?.agent;
  if (!agent?.agent) throw new Error("No agent is running in the launch origin pane.");
  if (!["codex", "claude"].includes(agent.agent)) throw new Error(`Unsupported agent: ${agent.agent}.`);
  if (agent.agent_status !== "idle") throw new Error(`The ${agent.agent} agent is ${agent.agent_status || "in an unknown state"}, not idle.`);

  const command = resumeCommand(agent, foreground(await processInfo(origin)));

  report(`Stopping ${agent.agent === "codex" ? "Codex" : "Claude"}…`);
  await sendKeys(origin, ["esc"]);
  const deadline = now() + STOP_TIMEOUT_MS;
  while (foreground(await processInfo(origin)).length > 0) {
    if (now() >= deadline) throw new Error("The agent did not exit within 5 seconds. No resume command was sent.");
    await sendKeys(origin, ["ctrl+c"]); // 두 TUI 모두 두 번 눌러 종료하는 방식이라 프로세스가 끝날 때까지 반복해서 누른다
    await sleep(400);
  }

  report("Resuming the same session…");
  await run(origin, command);
  report("Session resumed.");
  try {
    await focus(origin); // best-effort — resume 직후 Herdr가 아직 에이전트를 재감지하지 못했을 수 있다
  } catch {}
}
