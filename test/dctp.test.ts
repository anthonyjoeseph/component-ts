import * as assert from "node:assert/strict";
import { describe, test } from "node:test";
import { pipeWith as p } from "pipe-ts";
import * as r from "rxjs";
import { event, filter, map, merge, toObservable } from "../src/dctp/event";

describe("event", () => {
  test("init", async () => {});
  test("map", async () => {});
  test("filter", async () => {});
  test("merge simultaneous", async () => {
    const int = event(0, r.of(0, 1).pipe(r.observeOn(r.asapScheduler)));
    const int2 = event(0, r.of(99, 100).pipe(r.observeOn(r.asapScheduler)));

    const all = merge([int, int2, int, int2]);

    const final = await r.firstValueFrom(toObservable(all).pipe(r.toArray()));

    assert.deepStrictEqual(final, [
      [0, 0],
      [99, 99],
      [1, 1],
      [100, 100],
    ]);
  });
  test("filter + merge", async () => {
    const int = event(0, r.of(0, 1).pipe(r.observeOn(r.asapScheduler)));
    const int2 = event(0, r.of(0, 1).pipe(r.observeOn(r.asapScheduler)));

    const all = merge([
      int,
      p(
        int,
        map((num) => -num)
      ),
      int2,
      p(
        int2,
        filter((num) => num % 2 === 0),
        map((num) => -num)
      ),
    ]);

    const final = await r.firstValueFrom(toObservable(all).pipe(r.toArray()));

    assert.deepStrictEqual(final, [[0, -0], [0, -0], [1, -1], [1]]);
  });
});
