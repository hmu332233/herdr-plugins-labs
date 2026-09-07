# Agent Restart

Agent Restart safely restarts an idle Codex, Claude, Grok, or Agy agent in the pane where you invoke it, then resumes the same Herdr-reported session ID.

![Agent Restart session resumed example](./assets/example.png)

## Install

From a local checkout:

```sh
herdr plugin link ./agent-restart
```

The plugin does not edit Herdr configuration. Add an action binding yourself:

```toml
[[keys.command]]
key = "prefix+shift+r"
type = "plugin_action"
command = "dev.minung.agent-restart.restart"
description = "Restart Agent"
```

The CLI for whichever agent you use (Codex, Claude Code, Grok, or Agy) must be available on `PATH`. The plugin supports Herdr 0.7.4 or newer on macOS and Linux. From the repository root, run `pnpm test` to test every plugin.

## Behavior

Invoke the action from the agent's pane. A popup checks that Herdr reports a supported agent (`codex`, `claude`, `grok`, or `agy`) in the exact `idle` state, then reads the session ID from Herdr's `agent_session` or, for a previously resumed Codex, from the running `codex resume` command line. It clears the input with `Esc` and presses `Ctrl+C` repeatedly (both TUIs quit on a double press) until the pane's foreground process exits, giving up after 5 seconds.

It then runs the matching resume command (`codex resume <id>`, `claude --resume <id>`, `grok --resume <id>`, or `agy --conversation=<id>`) in the same launch origin pane, closes the popup, and returns focus. The resumed agent is visible in the pane itself, so the plugin performs no further verification.

If a check fails or the agent does not exit, Agent Restart sends no resume or recovery input. The popup keeps the explanation visible until you press any key. It does not restart active, blocked, unknown, unsupported, or session-less agents, and it does not recover original CLI options beyond the session ID.

Support is limited to agents for which Herdr itself reports a session ID (via `agent_session`). Agents such as OpenCode, which don't expose a session ID to Herdr or on their process command line, aren't supported — resuming the wrong session by guessing would violate the plugin's safety guarantees.
