# Space Tab Count

[English](./README.md) | [한국어](./README.ko.md)

Expose Herdr's server-owned workspace `tab_count` value as the `$tab_count`
custom token for expanded Space sidebar rows.

## Requirements

- Herdr 0.7.4 or newer
- Node.js 18 or newer

## Link for local development

From this directory:

```sh
herdr plugin link "$PWD"
herdr plugin action invoke dev.minung.space-tab-count.sync
```

The `sync` action initializes every open workspace. After that, the plugin
updates all workspace tokens when a tab is created or closed.

## Configure the sidebar

Add `$tab_count` to the Space rows in your Herdr configuration:

```toml
[ui.sidebar.spaces]
rows = [
  ["state_icon", "workspace", "$tab_count"],
  ["branch", "git_status"],
]
```

The token is a plain number, for example `repo · 3`. Metadata reporters cannot
change sidebar rows, so installing the plugin does not edit your Herdr config.

## Events and restart behavior

The plugin listens for `tab.created` and `tab.closed`. Each event reads the
current `tab_count` values from Herdr instead of maintaining its own counters.

Workspace metadata is not restored after a Herdr server restart. Run the sync
action again after restarting:

```sh
herdr plugin action invoke dev.minung.space-tab-count.sync
```

## Test

```sh
node --test
```
