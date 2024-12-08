import * as r from "rxjs";
import { createAsyncStart } from "./util";
import { test } from "node:test";
import * as assert from "node:assert/strict";

const waitMillis = (millis: number) => new Promise((res) => setTimeout(res, millis));

test("of", async () => {
  const asyncStart = createAsyncStart();
  const a = r.of(0);

  const b = a.pipe(r.takeUntil(asyncStart), r.toArray());

  const c = await r.firstValueFrom(b);

  assert.deepStrictEqual(c, [0]);
});

test("from", async () => {
  const asyncStart = createAsyncStart();
  const a = r.from([0, 1, 2]);

  const b = a.pipe(r.takeUntil(asyncStart), r.toArray());

  const c = await r.firstValueFrom(b);

  assert.deepStrictEqual(c, [0, 1, 2]);
});

test("delayed of", async () => {
  const asyncStart = createAsyncStart();
  const a = r.of(0);

  const b = a.pipe(r.delay(0), r.takeUntil(asyncStart), r.toArray());

  const c = await r.firstValueFrom(b);

  assert.deepStrictEqual(c, []);
});

test("mixed of", async () => {
  const asyncStart = createAsyncStart();
  const a = r.merge(r.of(0), r.of(1).pipe(r.delay(0)), r.of(2));

  const syncVals = await r.firstValueFrom(a.pipe(r.takeUntil(asyncStart), r.toArray()));
  const asyncVals = await r.firstValueFrom(a.pipe(r.skipUntil(asyncStart), r.toArray()));

  assert.deepStrictEqual(syncVals, [0, 2]);
  assert.deepStrictEqual(asyncVals, [1]);
});

test("subject", async () => {
  const asyncStart = createAsyncStart();
  const a = new r.Subject<number>();

  const [syncVals, asyncVals] = await Promise.all([
    r.lastValueFrom(a.pipe(r.takeUntil(asyncStart), r.toArray())),
    r.lastValueFrom(a.pipe(r.skipUntil(asyncStart), r.toArray())),
    waitMillis(0).then(() => {
      a.next(0);
      a.next(1);
      a.next(2);
      a.complete();
    }),
  ]);

  assert.deepStrictEqual(syncVals, []);
  assert.deepStrictEqual(asyncVals, [0, 1, 2]);
});

test("behavior subject", async () => {
  const asyncStart = createAsyncStart();
  const a = new r.BehaviorSubject(0);

  const [syncVals, asyncVals] = await Promise.all([
    r.lastValueFrom(a.pipe(r.takeUntil(asyncStart), r.toArray())),
    r.lastValueFrom(a.pipe(r.skipUntil(asyncStart), r.toArray())),
    waitMillis(0).then(() => {
      a.next(1);
      a.next(2);
      a.complete();
    }),
  ]);

  assert.deepStrictEqual(syncVals, [0]);
  assert.deepStrictEqual(asyncVals, [1, 2]);
});
