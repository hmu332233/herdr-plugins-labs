# herdr-plugins-labs

Experimental plugins for [Herdr](https://herdr.dev/).

## Development

This repository uses pnpm 11.5.1 and Node.js 20.17 or newer. Install the
workspace with `pnpm install`, then run every plugin's test suite with:

```sh
pnpm test
```

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
