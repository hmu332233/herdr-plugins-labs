# Quick Agent

Quick Agent lets you start Codex or Claude Code in a new pane without leaving your keyboard. Open the compact popup, choose an agent and split direction, and it launches beside the pane you started from.

![Quick Agent popup example](./assets/example.png)

## Install

From a local checkout:

```sh
herdr plugin link ./quick-agent
```

For a GitHub-hosted copy, use `herdr plugin install <owner>/<repo>/quick-agent`.
The plugin does not edit Herdr configuration. Add the suggested action binding yourself:

```toml
[[keys.command]]
key = "prefix+a"
type = "plugin_action"
command = "dev.minung.quick-agent.open"
description = "Open Quick Agent"
```

From the repository root, install the pinned workspace dependencies with `pnpm install`; run all plugin tests with `pnpm test`.
Codex and Claude Code are invoked when selected and must be available on `PATH`. The plugin supports Herdr 0.7.4 or newer on macOS and Linux.

## Use

Run the configured shortcut (for example, `prefix+a`) to open the 44×10 popup. Choose whether to start Codex or Claude Code and whether the new pane should open to the right or below. The initial selection is `Codex → Right`; use Up/Down and Enter to launch, or Esc/Ctrl+C to cancel.

The selected agent starts in a 50:50 split, uses the same working directory as the pane where you opened Quick Agent, and receives focus. The popup briefly shows that it is launching and closes after success.

The launch origin is captured when the action opens. If that pane disappears, the launcher reports an error and never retargets the launch. If the agent command fails after splitting, the created pane is intentionally left open for inspection.
