import * as r from "rxjs";
import { StaticAction, e, InitAction, ModifyAction, ChildAction } from "./index";
import { h } from "hastscript";
import { test } from "node:test";
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

test("has properties", async () => {
  const node = e("a", { href: r.of("abcd") });
  const initAction = await r.firstValueFrom(node);
  assert.deepEqual(filterIds([initAction]), [{ type: "init", node: h("a", { id: "a", href: "abcd" }) } as InitAction]);
});

test("delayed properties", async () => {
  const node = e("a", { href: r.of("abcd").pipe(r.delay(0)) }).pipe(r.take(2), r.toArray());
  const actions = await r.firstValueFrom(node);
  assert.deepEqual(filterIds(actions), [
    { type: "init", node: h("a", { id: "a" }) } as InitAction,
    { type: "modify", id: "a", property: { href: "abcd" } } as ModifyAction,
  ]);
});

test("has children", async () => {
  const node = e("div", { className: r.of("class-name") }, [
    e("a", { href: r.of("abcd") }),
    e("a", { href: r.of("1234") }),
    e("a", { href: r.of("!@#$") }),
  ]);
  const initAction = await r.firstValueFrom(node);
  assert.deepEqual(filterIds([initAction]), [
    {
      type: "init",
      node: h("div", { id: "div", className: "class-name" }, [
        h("a", { id: "div-0a", href: "abcd" }),
        h("a", { id: "div-1a", href: "1234" }),
        h("a", { id: "div-2a", href: "!@#$" }),
      ]),
    } as InitAction,
  ]);
});

test("delayed children", async () => {
  const delayedChild = e("a", { href: r.of("1234") }).pipe(r.delay(0));

  const node = e("div", { className: r.of("class-name") }, [
    e("a", { href: r.of("abcd") }),
    delayedChild,
    e("a", { href: r.of("!@#$") }),
  ]);
  const actions = await r.firstValueFrom(node.pipe(r.toArray()));
  assert.deepEqual(filterIds(actions), [
    {
      type: "init",
      node: h("div", { id: "div", className: "class-name" }, [
        h("a", { id: "div-0a", href: "abcd" }),
        h("a", { id: "div-2a", href: "!@#$" }),
      ]),
    } as InitAction,
    {
      type: "child",
      targetId: "div",
      domAction: { type: "insertAt", index: 1, items: [h("a", { id: "div-1a", href: "1234" })] },
    } as ChildAction,
  ]);
});

test("most recent sync child is initialized", async () => {
  const node = e("div", { className: r.of("class-name") }, [
    e("a", { href: r.of("abcd") }),
    r.of("0", "1", "2").pipe(r.switchMap((num) => e("a", { href: r.of(num) }))),
    e("a", { href: r.of("!@#$") }),
  ]);
  const actions = await r.firstValueFrom(node);
  assert.deepEqual(filterIds([actions]), [
    {
      type: "init",
      node: h("div", { id: "div", className: "class-name" }, [
        h("a", { id: "div-0a", href: "abcd" }),
        h("a", { id: "div-1a", href: "2" }),
        h("a", { id: "div-2a", href: "!@#$" }),
      ]),
    } as InitAction,
  ]);
});

test("children in series", async () => {
  const node = e("div", { className: r.of("class-name") }, [
    e("a", { href: r.of("abcd") }),
    r.merge(r.of("0"), r.of("1", "2").pipe(r.delay(0))).pipe(r.switchMap((num) => e("a", { href: r.of(num) }))),
    e("a", { href: r.of("!@#$") }),
  ]);
  const actions = await r.firstValueFrom(node.pipe(r.toArray()));
  assert.deepEqual(filterIds(actions), [
    {
      type: "init",
      node: h("div", { id: "div", className: "class-name" }, [
        h("a", { id: "div-0a", href: "abcd" }),
        h("a", { id: "div-1a", href: "0" }),
        h("a", { id: "div-2a", href: "!@#$" }),
      ]),
    } as InitAction,
    {
      type: "child",
      targetId: "div",
      domAction: { type: "deleteAt", index: 1 },
    } as ChildAction,
    {
      type: "child",
      targetId: "div",
      domAction: { type: "insertAt", index: 1, items: [h("a", { id: "div-3a", href: "1" })] },
    } as ChildAction,
    {
      type: "child",
      targetId: "div",
      domAction: { type: "deleteAt", index: 1 },
    } as ChildAction,
    {
      type: "child",
      targetId: "div",
      domAction: { type: "insertAt", index: 1, items: [h("a", { id: "div-a4", href: "2" })] },
    } as ChildAction,
  ]);
});
