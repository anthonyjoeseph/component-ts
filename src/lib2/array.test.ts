import * as r from "rxjs";
import {
  StaticAction,
  element as e,
  InitAction,
  ModifyAction,
  ChildAction,
  RxNode,
  DynamicAction,
  DynamicInitAction,
} from "./element";
import { array as a } from "./array";
import { h } from "hastscript";
import { describe, test } from "node:test";
import * as assert from "node:assert/strict";
import { DOMAction } from "../lib/state/array/domAction";

const scrubIdCallbacks = (actions: DynamicAction[]): DynamicAction[] =>
  actions.map((action) =>
    action.type !== "dynamic-init"
      ? action
      : ({
          type: "dynamic-init",
          index: action.index,
          action: {
            type: "init",
            node: action.action.node,
          },
        } as DynamicInitAction)
  );

describe("array", () => {
  test("insertAt single", async () => {
    const node = a(
      r.of({ type: "insertAt", index: 0, items: [e("a", { href: r.of("abcd") })] } as DOMAction<RxNode>)
    ).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "dynamic-init",
        index: 0,
        action: { type: "init", node: h("a", { id: "a", href: "abcd" }) },
      } as DynamicInitAction,
    ]);
  });
});
