import * as r from "rxjs";
import { StaticAction, e, InitAction, ModifyAction, ChildAction, RxNode } from "./index";
import { h } from "hastscript";
import { describe, test } from "node:test";
import * as assert from "node:assert/strict";

const filterIds = (actions: StaticAction[]): StaticAction[] =>
  actions.map((action) =>
    action.type !== "init"
      ? action
      : ({
          type: "init",
          node: action.node,
        } as InitAction)
  );

describe("element", () => {
  test.skip("has properties", async () => {
    const node = e("a", { href: r.of("abcd") });
    const initAction = await r.firstValueFrom(node);
    assert.deepEqual(filterIds([initAction]), [
      { type: "init", node: h("a", { id: "a", href: "abcd" }) } as InitAction,
    ]);
  });

  test.skip("delayed properties", async () => {
    const node = e("a", { href: r.of("abcd").pipe(r.delay(0)) }).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(filterIds(actions), [
      { type: "init", node: h("a", { id: "a" }) } as InitAction,
      { type: "modify", id: "a", property: { href: "abcd" } } as ModifyAction,
    ]);
  });

  test.skip("has children", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      e("a", { href: r.of("1234") }),
      e("a", { href: r.of("!@#$") }),
    ]);
    const initAction = await r.firstValueFrom(node);
    const plainElement = h("div", { id: "div", hidden: false }, [
      h("a", { id: "div-0a", href: "abcd" }),
      h("a", { id: "div-1a", href: "1234" }),
      h("a", { id: "div-2a", href: "!@#$" }),
    ]);
    assert.deepEqual(filterIds([initAction]), [
      {
        type: "init",
        node: plainElement,
      } as InitAction,
    ]);
  });

  test.skip("most recent sync child is initialized", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      r.of("0", "1", "2").pipe(r.switchMap((num) => e("a", { href: r.of(num) }))),
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(filterIds([actions]), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-3a", href: "2" }),
          h("a", { id: "div-4a", href: "!@#$" }),
        ]),
      } as InitAction,
    ]);
  });

  test("delayed children", async () => {
    const delayedChild = e("a", { href: r.of("1234") }).pipe(r.delay(0));

    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      delayedChild,
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node.pipe(r.toArray()));
    assert.deepEqual(filterIds(actions), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "!@#$" }),
        ]),
      } as InitAction,
      {
        type: "child",
        targetId: "div",
        domAction: { type: "insertAt", index: 1, items: [h("a", { id: "div-2a", href: "1234" })] },
      } as ChildAction,
    ]);
  });

  test.skip("delayed child property", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      e("a", { href: r.of("1234"), hidden: r.of(false).pipe(r.delay(0)) }),
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(filterIds([actions]), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "1234" }),
          h("a", { id: "div-2a", href: "!@#$" }),
        ]),
      } as InitAction,
      {
        type: "modify",
        id: "div-1a",
        property: { hidden: false },
      } as ModifyAction,
    ]);
  });

  test.skip("children in series", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      r.merge(r.of("0"), r.of("1", "2").pipe(r.delay(0))).pipe(r.switchMap((num) => e("a", { href: r.of(num) }))),
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node.pipe(r.toArray()));
    assert.deepEqual(filterIds(actions), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "0" }),
          h("a", { id: "div-2a", href: "!@#$" }),
        ]),
      } as InitAction,
      {
        type: "child",
        targetId: "div",
        domAction: { type: "replaceAt", index: 1, items: [h("a", { id: "div-3a", href: "1" })] },
      } as ChildAction,
      {
        type: "child",
        targetId: "div",
        domAction: { type: "replaceAt", index: 1, items: [h("a", { id: "div-4a", href: "2" })] },
      } as ChildAction,
    ]);
  });
});
