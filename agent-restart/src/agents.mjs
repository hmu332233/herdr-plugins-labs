// Herdr가 agent_session으로 세션 ID를 확정적으로 보고하는 에이전트만 등록한다.
// (예: opencode는 herdr가 세션 ID를 추적하지 않고, 프로세스 argv에도 노출되지 않아 제외됨.)
export const AGENTS = {
  codex: { label: "Codex", resume: (sessionId) => `codex resume ${sessionId}` },
  claude: { label: "Claude", resume: (sessionId) => `claude --resume ${sessionId}` },
  grok: { label: "Grok", resume: (sessionId) => `grok --resume ${sessionId}` },
  agy: { label: "Agy", resume: (sessionId) => `agy --conversation=${sessionId}` },
};
