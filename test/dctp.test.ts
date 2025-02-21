import * as assert from "node:assert";
import { describe, test } from "node:test";
import * as r from "rxjs";
import * as e from "../src/dctp/event";

describe("event", () => {
  test("converts to/from observable", async () => {
    const one = e.fromObservable(r.timer(0, 1000));

    e.toObservable(one).subscribe(console.log);
  });

  test("stack safe recursive definitions", async () => {
    const ones: e.Event<number> = e.defer(() => {
      return e.mergeAll(e.of(e.of(1), ones));
    });

    // fifty thousand should be enough to reveal any
    // stack overflows caused by the implementation
    const obs = e.toObservable(ones).pipe(r.take(50000), r.toArray());
    const finiteOnes = await r.firstValueFrom(obs);

    const fiftyThousandOnes = new Array(50000).map(() => 1);

    assert.deepStrictEqual(finiteOnes, fiftyThousandOnes);
  });
  test("can batch simultaneous emissions", async () => {
    const ancestorO = r.of(null).pipe(
      r.delay(0),
      r.mergeMap(() => r.of(0, 1, 2)),
      r.share()
    );
    const ancestor = e.fromObservable(ancestorO);
    const child = e.mergeAll(e.of(ancestor, ancestor));

    const simultaneous = e.batchSimultaneous(child);

    const output = await r.firstValueFrom(e.toObservable(simultaneous).pipe(r.toArray()));

    assert.deepStrictEqual(output, [[0, 1, 2, 0, 1, 2]]);
  });
});
