import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@inquirer/testing";
import select from "@inquirer/select";
import { launchChoices, selectConfig } from "../src/chooser.mjs";

const config = selectConfig();

test("select shows the four keyboard-first choices with Codex Right selected", async () => {
  const { answer, events, getScreen } = await render(select, config);
  const screen = getScreen();
  assert.match(screen, /❯ Codex → Right/);
  assert.match(screen, /Codex ↓ Down/);
  assert.match(screen, /Claude → Right/);
  assert.match(screen, /Claude ↓ Down/);
  assert.match(screen, /Enter launch/);
  events.keypress("enter");
  await answer;
});

test("select moves with Up/Down and submits the highlighted choice", async () => {
  const { answer, events, getScreen } = await render(select, config);
  events.keypress("down");
  assert.match(getScreen(), /❯ Codex ↓ Down/);
  events.keypress("down");
  assert.match(getScreen(), /❯ Claude → Right/);
  events.keypress("up");
  assert.match(getScreen(), /❯ Codex ↓ Down/);
  events.keypress("down");
  events.keypress("enter");
  await assert.doesNotReject(answer);
  assert.deepEqual(await answer, launchChoices[2].value);
});

test("select retains type-to-search convenience", async () => {
  const { answer, events, getScreen } = await render(select, config);
  events.type("Claude");
  assert.match(getScreen(), /❯ Claude → Right/);
  events.keypress("enter");
  assert.deepEqual(await answer, launchChoices[2].value);
});
