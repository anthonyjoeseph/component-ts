import * as r from "rxjs";
import { takeSynchronous } from "./index";

const waitMillis = (millis: number) => new Promise((res) => setTimeout(res, millis));

test("of", async () => {
  const a = r.of(0);

  const b = a.pipe(takeSynchronous(), r.toArray());

  const c = await r.firstValueFrom(b);

  expect(c).toEqual([0]);
});

test("from", async () => {
  const a = r.from([0, 1, 2]);

  const b = a.pipe(takeSynchronous(), r.toArray());

  const c = await r.firstValueFrom(b);

  expect(c).toEqual([0, 1, 2]);
});

test("delayed of", async () => {
  const a = r.of(0);

  const b = a.pipe(r.delay(0), takeSynchronous(), r.toArray());

  const c = await r.firstValueFrom(b);

  expect(c).toEqual([]);
});

test("mixed of", async () => {
  const a = r.merge(r.of(0), r.of(1).pipe(r.delay(0)), r.of(2));

  const b = a.pipe(takeSynchronous(), r.toArray());

  const c = await r.firstValueFrom(b);

  expect(c).toEqual([0, 2]);
});

test("behavior subject - synchronous", async () => {
  const a = new r.BehaviorSubject(0);

  const c = await r.firstValueFrom(a.pipe(takeSynchronous()));

  expect(c).toEqual(0);
});

test("behavior subject - asynchronous", async () => {
  const a = new r.Subject<number>();

  const [c] = await Promise.all([
    r.lastValueFrom(a.pipe(takeSynchronous(), r.toArray())),
    waitMillis(0).then(() => {
      a.next(0);
      a.next(1);
      a.next(2);
      a.complete();
    }),
  ]);

  expect(c).toEqual([]);
});

test("behavior subject - both", async () => {
  const a = new r.BehaviorSubject(0);

  const [c] = await Promise.all([
    r.lastValueFrom(a.pipe(takeSynchronous(), r.toArray())),
    waitMillis(0).then(() => {
      a.next(1);
      a.next(2);
    }),
  ]);

  expect(c).toEqual([0]);
});
