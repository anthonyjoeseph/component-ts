import * as r from "rxjs";
import {
  element as e,
  RxNode,
  DynamicAction,
  DynamicInitAction,
  DynamicModifyAction,
  DynamicChildAction,
  InitAction,
  ChildAction,
} from "./element";
import { array as a } from "./array";
import { h } from "hastscript";
import { describe, test } from "node:test";
import * as assert from "node:assert/strict";
import { DOMAction } from "../lib/state/array/domAction";
import { scrubIdCallbacks } from "./test-util";

const insert = (items: RxNode[], index = 0): DOMAction<RxNode> => ({ type: "insertAt", items, index });
const insert$ = (items: RxNode[], index = 0): RxNode => a(r.of(insert(items, index)));

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
        nodes: [h("a", { id: "a", href: "abcd" })],
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
        nodes: [
          h("a", { id: "a", href: "abcd" }),
          h("a", { id: "a", href: "1234" }),
          h("a", { id: "a", href: "!@#$" }),
        ],
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
        nodes: [
          h("a", { id: "a", href: "abcd" }),
          h("a", { id: "a", href: "1234" }),
          h("a", { id: "a", href: "!@#$" }),
        ],
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
        nodes: [
          h("a", { id: "a", href: "abcd" }),
          h("a", { id: "a", href: "1234" }),
          h("a", { id: "a", href: "!@#$" }),
        ],
      } as DynamicInitAction,
      {
        type: "dynamic-child",
        domAction: { type: "deleteAt", index: 2 },
      } as DynamicChildAction,
      {
        type: "dynamic-init",
        index: 2,
        nodes: [h("a", { id: "a", href: "!@#$" })],
      } as DynamicInitAction,
      {
        type: "dynamic-child",
        domAction: { type: "deleteAt", index: 2 },
      } as DynamicChildAction,
    ]);
    assert.equal(deleted1, true);
    assert.equal(deleted2, true);
  });

  test.skip("move", async () => {
    const node = a(
      r.of<DOMAction<RxNode>[]>(
        {
          type: "insertAt",
          index: 0,
          items: [e("a", { href: r.of("abcd") }), e("a", { href: r.of("1234") }), e("a", { href: r.of("!@#$") })],
        },
        { type: "move", source: 1, destination: 0 }
      )
    ).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "dynamic-init",
        index: 0,
        nodes: [
          h("a", { id: "a", href: "abcd" }),
          h("a", { id: "a", href: "1234" }),
          h("a", { id: "a", href: "!@#$" }),
        ],
      } as DynamicInitAction,
      {
        type: "dynamic-child",
        domAction: { type: "move", source: 1, destination: 0 },
      } as DynamicChildAction,
    ]);
  });

  test.skip("id within element", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      a(
        r.of<DOMAction<RxNode>[]>({
          type: "insertAt",
          index: 0,
          items: [e("a", { href: r.of("abcd") }), e("a", { href: r.of("1234") }), e("a", { href: r.of("!@#$") })],
        })
      ),
    ]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "1234" }),
          h("a", { id: "div-2a", href: "!@#$" }),
        ]),
      } as InitAction,
    ]);
  });

  test.skip("id callback", async () => {
    let middleId = "";
    const node = e("div", { hidden: r.of(false) }, [
      a(
        r.of<DOMAction<RxNode>[]>({
          type: "insertAt",
          index: 0,
          items: [
            e("a", { href: r.of("abcd") }),
            e("a", { href: r.of("1234") }, [], (id) => {
              middleId = id;
            }),
            e("a", { href: r.of("!@#$") }),
          ],
        })
      ),
    ]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    (actions[0] as InitAction).idCallbacks.forEach(({ idCallback, id }) => {
      idCallback(id);
    });
    assert.equal(middleId, "div-1a");
  });

  test.skip("id within element - insert after init", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      a(
        r.of<DOMAction<RxNode>[]>(
          {
            type: "insertAt",
            index: 0,
            items: [e("a", { href: r.of("abcd") }), e("a", { href: r.of("1234") }), e("a", { href: r.of("!@#$") })],
          },
          {
            type: "insertAt",
            index: 1,
            items: [e("a", { href: r.of("9876") }), e("a", { href: r.of("wxyz") })],
          }
        )
      ),
    ]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
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
        type: "child",
        targetId: "div",
        domAction: {
          type: "insertAt",
          index: 1,
          items: [h("a", { id: "div-3a", href: "9876" }), h("a", { id: "div-4a", href: "wxyz" })],
        },
      } as ChildAction,
    ]);
  });

  test.skip("id within element - nested insert", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      insert$([
        e("a", { href: r.of("abcd") }),
        insert$([
          e("a", { href: r.of("efgh") }),
          insert$([e("a", { href: r.of("!@#$") })]),
          e("a", { href: r.of("0123") }),
        ]),
        e("a", { href: r.of("4567") }),
      ]),
    ]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "efgh" }),
          h("a", { id: "div-2a", href: "!@#$" }),
          h("a", { id: "div-3a", href: "0123" }),
          h("a", { id: "div-4a", href: "4567" }),
        ]),
      } as InitAction,
    ]);
  });

  test.skip("id within element - nested insert after init", async () => {
    const node = e("div", { hidden: r.of(false) }, [
      insert$([
        e("a", { href: r.of("abcd") }),
        insert$([
          e("a", { href: r.of("efgh") }),
          a(r.of(insert([e("a", { href: r.of("!@#$") })]), insert([e("a", { href: r.of("wxyz") })], 1))),
          e("a", { href: r.of("0123") }),
        ]),
        e("a", { href: r.of("4567") }),
      ]),
    ]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "efgh" }),
          h("a", { id: "div-2a", href: "!@#$" }),
          h("a", { id: "div-3a", href: "0123" }),
          h("a", { id: "div-4a", href: "4567" }),
        ]),
      } as InitAction,
      {
        type: "child",
        targetId: "div",
        domAction: {
          type: "insertAt",
          index: 3,
          items: [h("a", { id: "div-5a", href: "wxyz" })],
        },
      } as ChildAction,
    ]);
  });

  test.skip("id callback - nested insert after init", async () => {
    let sixthElementId = "";

    const node = e("div", { hidden: r.of(false) }, [
      insert$([
        e("a", { href: r.of("abcd") }),
        insert$([
          e("a", { href: r.of("efgh") }),
          a(
            r.of(
              insert([e("a", { href: r.of("!@#$") })]),
              insert(
                [
                  e("a", { href: r.of("wxyz") }, [], (id) => {
                    sixthElementId = id;
                  }),
                ],
                1
              )
            )
          ),
          e("a", { href: r.of("0123") }),
        ]),
        e("a", { href: r.of("4567") }),
      ]),
    ]).pipe(r.toArray());
    const actions = await r.firstValueFrom(node);
    (actions[1] as ChildAction).idCallbacks.forEach(({ idCallback, id }) => {
      idCallback(id);
    });
    assert.equal(sixthElementId, "div-5a");
    assert.deepEqual(scrubIdCallbacks(actions), [
      {
        type: "init",
        node: h("div", { id: "div", hidden: false }, [
          h("a", { id: "div-0a", href: "abcd" }),
          h("a", { id: "div-1a", href: "efgh" }),
          h("a", { id: "div-2a", href: "!@#$" }),
          h("a", { id: "div-3a", href: "0123" }),
          h("a", { id: "div-4a", href: "4567" }),
        ]),
      } as InitAction,
      {
        type: "child",
        targetId: "div",
        domAction: {
          type: "insertAt",
          index: 3,
          items: [h("a", { id: "div-5a", href: "wxyz" })],
        },
      } as ChildAction,
    ]);
  });
});
