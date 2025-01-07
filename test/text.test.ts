import * as r from "rxjs";
import { element as e } from "../src/lib/node/element";
import { text as t } from "../src/lib/node/text";
import { array as a } from "../src/lib/node/array";
import { h } from "hastscript";
import { describe, test } from "node:test";
import * as assert from "node:assert/strict";
import { scrubIdCallbacks } from "./test-util";
import { DOMAction } from "../src/lib/array/domAction";
import { InitAction, RxNode } from "../src/lib/node/actions";

const insert = (items: RxNode[], index = 0): DOMAction<RxNode> => ({ type: "insertAt", items, index });
const insert$ = (items: RxNode[], index = 0): RxNode => a(r.of(insert(items, index)));

describe("text", () => {
  test.skip("solo text child inside div", async () => {
    const node = e("div", {}, [t(r.of("hello text"))]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "init",
        node: h("div", { id: "div" }, [{ type: "text", value: "hello text" }]),
      } as InitAction,
    ]);
  });
  test("id within element - nested insert", async () => {
    let penultimateElement: string | null = null;
    const node = e("div", { hidden: r.of(false) }, [
      insert$([
        e("a", { href: r.of("abcd") }),
        insert$([
          e("a", { href: r.of("efgh") }),
          insert$([t(r.of("hello text"))]),
          e("a", { href: r.of("0123") }, [], (id) => (penultimateElement = id)),
        ]),
        e("a", { href: r.of("4567") }),
      ]),
    ]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    (actions[0] as InitAction).idCallbacks.forEach(({ idCallback, id }) => idCallback(id));
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "efgh" }),
          { type: "text", value: "hello text" },
          h("a", { id: "div-2a", href: "0123" }),
          h("a", { id: "div-3a", href: "4567" }),
        ]),
      } as InitAction,
    ]);
    assert.equal(penultimateElement, "div-2a");
  });
});
