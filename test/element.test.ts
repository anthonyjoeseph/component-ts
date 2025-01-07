import * as r from "rxjs";
import { element as e } from "../src/lib/node/element";
import { h } from "hastscript";
import { describe, test } from "node:test";
import * as assert from "node:assert/strict";
import { scrubIdCallbacks } from "./test-util";
import { InitAction, ChildAction, ModifyAction } from "../src/lib/node/actions";

describe("element", () => {
  test("has properties", async () => {
    const node = e("a", { href: r.of("abcd") });
    const initAction = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks([initAction]), [
      { type: "init", node: h("a", { id: "a", href: "abcd" }) } as InitAction,
    ]);
  });

  test("id callback", async () => {
    let elementId: string | null = null;
    const node = e("a", { href: r.of("abcd") }, [], (id) => {
      elementId = id;
    });
    const initAction = (await r.firstValueFrom(node)) as InitAction;
    initAction.idCallbacks.forEach(({ id, idCallback }) => idCallback(id));
    assert.deepEqual(elementId, "a");
  });

  test("nested id callback", async () => {
    let elementId: string | null = null;
    const node = e("html", {}, [
      e("div", {}),
      e("div", {}),
      e("div", {}, [e("a", {}), e("a", {}, [], (id) => (elementId = id)), e("a", {})]),
    ]);
    const initAction = (await r.firstValueFrom(node)) as InitAction;
    initAction.idCallbacks.forEach(({ id, idCallback }) => idCallback(id));
    assert.deepEqual(elementId, "html-2div-1a");
  });

  test("delayed nested id callback", async () => {
    let elementId: string | null = null;
    const node = e("html", {}, [
      e("div", {}),
      e("div", {}),
      e("div", {}, [e("a", {}), e("a", {}, [], (id) => (elementId = id)).pipe(r.delay(0)), e("a", {})]),
    ]).pipe(r.toArray());
    const [, insertAction] = (await r.firstValueFrom(node)) as [InitAction, ChildAction];
    insertAction.idCallbacks.forEach(({ id, idCallback }) => idCallback(id));
    assert.deepEqual(elementId, "html-2div-2a");
  });

  test("delayed properties", async () => {
    const node = e("a", { href: r.of("abcd").pipe(r.delay(0)) }).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      { type: "init", node: h("a", { id: "a" }) } as InitAction,
      { type: "modify", id: "a", property: { href: "abcd" } } as ModifyAction,
    ]);
  });

  test("has children", async () => {
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
    assert.deepEqual(scrubIdCallbacks([initAction]), [
      {
        type: "init",
        node: plainElement,
      } as InitAction,
    ]);
  });

  test("most recent sync child is initialized", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      r.of("0", "1", "2").pipe(r.switchMap((num) => e("a", { href: r.of(num) }))),
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks([actions]), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "2" }),
          h("a", { id: "div-2a", href: "!@#$" }),
        ]),
      } as InitAction,
    ]);
  });

  test("delayed children", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      e("a", { href: r.of("1234") }).pipe(r.delay(0)),
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node.pipe(r.toArray()));
    assert.deepEqual(scrubIdCallbacks(actions), [
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

  test("delayed child property", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      e("a", { href: r.of("1234"), hidden: r.of(false).pipe(r.delay(0)) }),
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node.pipe(r.toArray()));
    assert.deepEqual(scrubIdCallbacks(actions), [
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

  test("children in series", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      e("a", { href: r.of("abcd") }),
      r.merge(r.of("0"), r.of("1", "2").pipe(r.delay(0))).pipe(r.switchMap((num) => e("a", { href: r.of(num) }))),
      e("a", { href: r.of("!@#$") }),
    ]);
    const actions = await r.firstValueFrom(node.pipe(r.toArray()));
    assert.deepEqual(scrubIdCallbacks(actions), [
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
