# herdr-plugins-labs

Experimental plugins for [Herdr](https://herdr.dev/). Plugins are incubated
here, and the ones that prove useful graduate to their own repositories.

## Table of Contents

- [Plugins](#plugins)
  - [Quick Agent](#quick-agent)
  - [Space Tab Count](#space-tab-count)
  - [Space Stats](#space-stats)
- [Graduated](#graduated)
  - [Symlink Worktree](#symlink-worktree)

## Plugins

### [Quick Agent](./quick-agent)

Choose Codex or Claude and a split direction from a keyboard-friendly popup, then launch it beside your current pane.

[![Quick Agent popup example](./quick-agent/assets/example.png)](./quick-agent)

### [Space Tab Count](./space-tab-count)

Exposes each workspace's tab count as the `$tab_count` Space sidebar token.

[![Space Tab Count sidebar example](./space-tab-count/assets/example.png)](./space-tab-count)

### [Space Stats](./space-stats)

Exposes tab, pane, and detected-agent counts as the `$space_stats` Space sidebar
token.

[![Space Stats sidebar example](./space-stats/assets/example.png)](./space-stats)

## Graduated

Plugins that started here and now live in their own repositories.

### [Symlink Worktree](https://github.com/hmu332233/herdr-symlink-worktree)

Shares selected gitignored files and directories (`.env`, build caches, etc.)
from your main Git checkout with every new herdr worktree via symlinks.

[![Symlink Worktree terminal example](https://raw.githubusercontent.com/hmu332233/herdr-symlink-worktree/main/docs/assets/symlink-worktree-overview.png)](https://github.com/hmu332233/herdr-symlink-worktree)
