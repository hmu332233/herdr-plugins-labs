import readline from "node:readline";
import process from "node:process";
import select from "@inquirer/select";

export const launchChoices = [
  { value: { agent: "codex", direction: "right" }, name: "Codex → Right", short: "Codex → Right" },
  { value: { agent: "codex", direction: "down" }, name: "Codex ↓ Down", short: "Codex ↓ Down" },
  { value: { agent: "claude", direction: "right" }, name: "Claude → Right", short: "Claude → Right" },
  { value: { agent: "claude", direction: "down" }, name: "Claude ↓ Down", short: "Claude ↓ Down" },
];

const theme = {
  icon: { cursor: "❯" },
  style: {
    keysHelpTip: () => "↑↓ navigate • Enter launch • Esc cancel",
  },
};

export function selectConfig(choices = launchChoices) {
  return {
    message: "Choose an agent and direction",
    choices,
    default: choices[0]?.value,
    pageSize: 4,
    theme,
  };
}

async function runSelect(config, { input = process.stdin, output = process.stdout, abortOnEnd = false } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const onKeypress = (_input, key) => {
    if (key?.name === "escape" || (key?.ctrl && key.name === "c")) abort();
  };

  if (abortOnEnd && input.readableEnded) return undefined;
  // ponytail: default 500ms lone-Esc flush makes Esc feel slow next to Ctrl+C;
  // 100ms is instant to humans. Worst case (escape sequence split over slow ssh)
  // misreads as Esc and the popup just closes — benign.
  readline.emitKeypressEvents(input, { escapeCodeTimeout: 100 });
  input.on("keypress", onKeypress);
  if (abortOnEnd) input.on("end", abort);
  try {
    return await select(
      config,
      { input, output, signal: controller.signal, clearPromptOnDone: true },
    );
  } catch (error) {
    if (["AbortPromptError", "CancelPromptError", "ExitPromptError"].includes(error.name)) return undefined;
    throw error;
  } finally {
    input.off("keypress", onKeypress);
    input.off("end", abort);
  }
}

export function chooseLaunch(choices = launchChoices, streams) {
  return runSelect(selectConfig(choices), streams);
}

export function promptClose(streams) {
  // ponytail: abortOnEnd so piped stdin (tests) exits instead of hanging on EOF
  return runSelect(
    { message: "Press Enter or Esc to close.", choices: [{ name: "Close", value: true }], theme: { helpMode: "never" } },
    { ...streams, abortOnEnd: true },
  );
}
