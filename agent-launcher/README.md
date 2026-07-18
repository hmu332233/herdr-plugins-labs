# Agent Launcher

Agent Launcher opens a compact 44×10 popup chooser for launching Codex or Claude Code beside the launch origin pane.

## Install

From a local checkout:

```sh
herdr plugin link ./agent-launcher
```

For a GitHub-hosted copy, use `herdr plugin install <owner>/<repo>/agent-launcher`.
The plugin does not edit Herdr configuration. Add the suggested action binding yourself:

```toml
[[keys.command]]
key = "prefix+a"
type = "plugin_action"
command = "dev.minung.agent-launcher.open"
description = "Open Agent Launcher"
```

Codex and Claude Code must be available on `PATH`. The plugin supports Herdr 0.7.4 or newer on macOS and Linux.

## Use

The initial selection is `Codex →`. Use arrow keys and Enter to launch, or click one of the four choices. Press Esc to cancel. The selected agent starts in a 50:50 split, inherits the launch origin pane's foreground directory (falling back to its pane directory), and receives focus.

The launch origin is captured when the action opens. If that pane disappears, the launcher reports an error and never retargets the launch. If the agent command fails after splitting, the created pane is intentionally left open for inspection.
