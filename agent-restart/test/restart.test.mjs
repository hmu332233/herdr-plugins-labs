import assert from "node:assert/strict";
import test from "node:test";
import { foreground, restartAgent, resumeCommand } from "../src/restart.mjs";

function state(agent, agent_status, session) {
  return { result: { agent: { agent, agent_status, agent_session: session ? { value: session } : undefined } } };
}

function processes(list) {
  return { result: { process_info: { shell_pid: 1, foreground_processes: [{ pid: 1, argv: ["-zsh"] }, ...list] } } };
}

function clock() {
  let time = 0;
  return { now: () => time, sleep: async (milliseconds) => { time += milliseconds; } };
}

function harness(agentResponse, processResponses) {
  const calls = [];
  return {
    calls,
    operations: {
      getAgent: async () => agentResponse,
      processInfo: async () => (processResponses.length > 1 ? processResponses.shift() : processResponses[0]),
      sendKeys: async (pane, keys) => calls.push(["keys", pane, ...keys]),
      run: async (pane, command) => calls.push(["run", pane, command]),
      focus: async (pane) => calls.push(["focus", pane]),
      ...clock(),
    },
  };
}

test("foreground excludes the pane shell and tolerates missing process info", () => {
  assert.deepEqual(foreground(processes([{ pid: 2, argv: ["codex"] }])), [{ pid: 2, argv: ["codex"] }]);
  assert.deepEqual(foreground({ result: { process_info: {} } }), []);
  assert.deepEqual(foreground({}), []);
});

test("resumeCommand prefers the Herdr session ID and falls back to codex resume argv", () => {
  assert.equal(resumeCommand({ agent: "claude", agent_session: { value: "s1" } }, []), "claude --resume s1");
  assert.equal(resumeCommand({ agent: "codex", agent_session: { value: "s1" } }, []), "codex resume s1");
  assert.equal(resumeCommand({ agent: "codex" }, [
    { pid: 2, argv: ["node", "/bin/codex", "resume", "s2"] },
  ]), "codex resume s2");
  assert.throws(() => resumeCommand({ agent: "codex" }, [{ pid: 2, argv: ["codex"] }]), /session ID/);
  assert.equal(resumeCommand({ agent: "claude", agent_session: { value: "s1" } }, [{ pid: 2 }]), "claude --resume s1");
});

test("restart presses ctrl+c until the agent exits, then resumes in the same pane", async () => {
  const { calls, operations } = harness(state("codex", "idle", "s1"), [
    processes([{ pid: 2, argv: ["codex"] }]),
    processes([{ pid: 2, argv: ["codex"] }]),
    processes([{ pid: 2, argv: ["codex"] }]),
    processes([]),
  ]);
  await restartAgent("w1:p1", operations);
  assert.deepEqual(calls, [
    ["keys", "w1:p1", "esc"],
    ["keys", "w1:p1", "ctrl+c"],
    ["keys", "w1:p1", "ctrl+c"],
    ["run", "w1:p1", "codex resume s1"],
    ["focus", "w1:p1"],
  ]);
});

test("guard failures send no input", async () => {
  const cases = [
    [state(undefined, undefined, undefined), /No agent/],
    [state("gemini", "idle", "s1"), /Unsupported agent/],
    [state("codex", "working", "s1"), /not idle/],
    [state("claude", "idle", undefined), /session ID/],
  ];
  for (const [response, message] of cases) {
    const { calls, operations } = harness(response, [processes([{ pid: 2, argv: ["claude"] }])]);
    await assert.rejects(restartAgent("w1:p1", operations), message);
    assert.deepEqual(calls, []);
  }
});

test("shutdown timeout sends no resume command", async () => {
  const { calls, operations } = harness(state("codex", "idle", "s1"), [
    processes([{ pid: 2, argv: ["codex"] }]),
  ]);
  await assert.rejects(restartAgent("w1:p1", operations), /did not exit within 5 seconds/);
  assert.equal(calls.filter(([name]) => name === "run").length, 0);
  assert.deepEqual(calls[0], ["keys", "w1:p1", "esc"]);
});

test("a failing focus does not fail the restart", async () => {
  const { calls, operations } = harness(state("claude", "idle", "s1"), [processes([]), processes([])]);
  operations.focus = async () => { throw new Error("agent not detected yet"); };
  await restartAgent("w1:p1", operations);
  assert.deepEqual(calls.at(-1), ["run", "w1:p1", "claude --resume s1"]);
});
