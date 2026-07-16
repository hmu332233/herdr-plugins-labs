# Space Stats

[English](./README.md) | [한국어](./README.ko.md)

Expose each Herdr workspace's tab, pane, and detected-agent counts as one
`$space_stats` custom token for expanded Space sidebar rows.

The token is formatted as `3t(5p) · 2 agents`.

## Requirements

- Herdr 0.7.4 or newer
- Node.js 18 or newer

## Link for local development

From this directory:

```sh
herdr plugin link "$PWD"
herdr plugin action invoke dev.minung.space-stats.sync
```

The `sync` action initializes every open workspace. Herdr 0.7.4 does not
provide a plugin startup event, so run it once after linking the plugin and
again after restarting the Herdr server.

## Configure the sidebar

Add `$space_stats` to the Space rows in your Herdr configuration:

```toml
[ui.sidebar.spaces]
rows = [
  ["state_icon", "workspace"],
  ["$space_stats"],
]
```

Metadata reporters provide values only, so the plugin does not edit your
sidebar configuration.

## Automatic updates

The plugin refreshes all workspace summaries when panes are created, closed,
moved, or exited; when detected agents appear or disappear; and when a tab is
closed. New tabs are covered by their accompanying `pane.created` event.

Each refresh reads the current Herdr state instead of maintaining counters.
Reports use Herdr's metadata sequence support so an older concurrent refresh
cannot replace a newer value.

## Test

```sh
node --test
```
