import * as r from "rxjs";
import { asyncStart } from "./util";

const waitMillis = (millis: number) => new Promise((res) => setTimeout(res, millis));

test("of", async () => {
  const a = r.of(0);

  const b = a.pipe(r.takeUntil(asyncStart), r.toArray());

  const c = await r.firstValueFrom(b);

  expect(c).toEqual([0]);
});

test("from", async () => {
  const a = r.from([0, 1, 2]);

  const b = a.pipe(r.takeUntil(asyncStart), r.toArray());

  const c = await r.firstValueFrom(b);

  expect(c).toEqual([0, 1, 2]);
});

test("delayed of", async () => {
  const a = r.of(0);

  const b = a.pipe(r.delay(0), r.takeUntil(asyncStart), r.toArray());

  const c = await r.firstValueFrom(b);

  expect(c).toEqual([]);
});

test("mixed of", async () => {
  const a = r.merge(r.of(0), r.of(1).pipe(r.delay(0)), r.of(2));

  const syncVals = await r.firstValueFrom(a.pipe(r.takeUntil(asyncStart), r.toArray()));
  const asyncVals = await r.firstValueFrom(a.pipe(r.skipUntil(asyncStart), r.toArray()));

  expect(syncVals).toEqual([0, 2]);
  expect(asyncVals).toEqual([1]);
});

test("subject", async () => {
  const a = new r.Subject<number>();

  const [syncEmissions, asyncEmissions] = await Promise.all([
    r.lastValueFrom(a.pipe(r.takeUntil(asyncStart), r.toArray())),
    r.lastValueFrom(a.pipe(r.skipUntil(asyncStart), r.toArray())),
    waitMillis(0).then(() => {
      a.next(0);
      a.next(1);
      a.next(2);
      a.complete();
    }),
  ]);

  expect(syncEmissions).toEqual([]);
  expect(asyncEmissions).toEqual([0, 1, 2]);
});

test("behavior subject", async () => {
  const a = new r.BehaviorSubject(0);

  const [syncEmissions, asyncEmissions] = await Promise.all([
    r.lastValueFrom(a.pipe(r.takeUntil(asyncStart), r.toArray())),
    r.lastValueFrom(a.pipe(r.skipUntil(asyncStart), r.toArray())),
    waitMillis(0).then(() => {
      a.next(1);
      a.next(2);
      a.complete();
    }),
  ]);

  expect(syncEmissions).toEqual([0]);
  expect(asyncEmissions).toEqual([1, 2]);
});
