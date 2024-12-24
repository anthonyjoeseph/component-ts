import * as r from "rxjs";
import {
  element as e,
  RxNode,
  DynamicAction,
  DynamicInitAction,
  DynamicModifyAction,
  DynamicChildAction,
} from "./element";
import { array as a } from "./array";
import { h } from "hastscript";
import { describe, test } from "node:test";
import * as assert from "node:assert/strict";
import { DOMAction, mapDomAction } from "../lib/state/array/domAction";
import * as N from "fp-ts/number";

import BS = r.BehaviorSubject;
import { arrayDiffEq } from "../lib/state/array/diff";

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
  test.skip("insertAt single", async () => {
    const node = a(
      r.of({
        type: "insertAt",
        index: 0,
        items: [e("a", { href: r.of("abcd") })],
      } as DOMAction<RxNode>)
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

  test.skip("insertAt many", async () => {
    const node = a(
      r.of({
        type: "insertAt",
        index: 0,
        items: [e("a", { href: r.of("abcd") }), e("a", { href: r.of("1234") }), e("a", { href: r.of("!@#$") })],
      } as DOMAction<RxNode>)
    ).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "dynamic-init",
        index: 0,
        action: { type: "init", node: h("a", { id: "a", href: "abcd" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 1,
        action: { type: "init", node: h("a", { id: "a", href: "1234" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 2,
        action: { type: "init", node: h("a", { id: "a", href: "!@#$" }) },
      } as DynamicInitAction,
    ]);
  });

  test.skip("insertAt many - modify", async () => {
    const node = a(
      r.of({
        type: "insertAt",
        index: 0,
        items: [
          e("a", { href: r.of("abcd") }),
          e("a", { href: r.of("1234") }),
          e("a", { href: r.of("!@#$"), hidden: r.of(false).pipe(r.delay(0)) }),
        ],
      } as DOMAction<RxNode>)
    ).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "dynamic-init",
        index: 0,
        action: { type: "init", node: h("a", { id: "a", href: "abcd" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 1,
        action: { type: "init", node: h("a", { id: "a", href: "1234" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 2,
        action: { type: "init", node: h("a", { id: "a", href: "!@#$" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-modify",
        index: 2,
        action: { type: "modify", id: "a", property: { hidden: false } },
      } as DynamicModifyAction,
    ]);
  });

  test.skip("deleteAt", async () => {
    let deleted1 = false;
    let deleted2 = false;
    const node = a(
      r.of(
        {
          type: "insertAt",
          index: 0,
          items: [
            e("a", { href: r.of("abcd") }),
            e("a", { href: r.of("1234") }),
            e("a", { href: r.of("!@#$") }).pipe(
              r.finalize(() => {
                deleted1 = true;
              })
            ),
          ],
        } as DOMAction<RxNode>,
        {
          type: "deleteAt",
          index: 2,
        } as DOMAction<RxNode>,
        {
          type: "insertAt",
          index: 2,
          items: [
            e("a", { href: r.of("!@#$") }).pipe(
              r.finalize(() => {
                deleted2 = true;
              })
            ),
          ],
        } as DOMAction<RxNode>,
        {
          type: "deleteAt",
          index: 2,
        } as DOMAction<RxNode>
      )
    ).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "dynamic-init",
        index: 0,
        action: { type: "init", node: h("a", { id: "a", href: "abcd" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 1,
        action: { type: "init", node: h("a", { id: "a", href: "1234" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 2,
        action: { type: "init", node: h("a", { id: "a", href: "!@#$" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-child",
        domAction: { type: "deleteAt", index: 2 },
      } as DynamicChildAction,
      {
        type: "dynamic-init",
        index: 2,
        action: { type: "init", node: h("a", { id: "a", href: "!@#$" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-child",
        domAction: { type: "deleteAt", index: 2 },
      } as DynamicChildAction,
    ]);
    assert.equal(deleted1, true);
    assert.equal(deleted2, true);
  });

  test("diffing", async () => {
    const elem = (num: number) => e("a", { href: r.of(`number-${num}`) });

    const arr = new BS([0, 1, 2]);

    const item = r.concat(r.of<number[]>([]), arr).pipe(
      r.pairwise(),
      r.mergeMap(([prev, cur]) => r.of(...arrayDiffEq(prev, cur, N.Eq))),
      r.map(mapDomAction(elem))
    );

    const node = a(item).pipe(r.toArray());
    const [actions] = await Promise.all([
      r.firstValueFrom(node),
      new Promise<void>((res) => {
        arr.next([1, 0, 2]);
        arr.complete();
        res();
      }),
    ]);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "dynamic-init",
        index: 0,
        action: { type: "init", node: h("a", { id: "a", href: "number-0" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 1,
        action: { type: "init", node: h("a", { id: "a", href: "number-1" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-init",
        index: 2,
        action: { type: "init", node: h("a", { id: "a", href: "number-2" }) },
      } as DynamicInitAction,
      {
        type: "dynamic-child",
        domAction: { type: "move", source: 1, destination: 0 },
      } as DynamicChildAction,
    ]);
  });
});
