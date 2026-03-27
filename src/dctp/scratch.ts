import { cold } from "./v5/constructors";
import {
  EMPTY,
  fromInstantaneous,
  map,
  of,
  share,
} from "./v5/basic-primitives";
import { batchSimultaneous } from "./v5/batch-simultaneous";
import { mergeAll } from "./v5/joins";
import * as r from "rxjs";
import { merge, switchMap } from "./v5/util";

/* const a = cold<number>((subscriber) => {
  let count = 0;
  const intervalId = setInterval(() => {
    if (count > 2) {
      subscriber.complete();
      clearTimeout(intervalId);
    }
    subscriber.next(count++);
  }, 1000);
}).pipe(share);

const merged = of(a, a.pipe(map((n) => n * 2))).pipe(
  mergeAll(),
  batchSimultaneous,
  fromInstantaneous,
  r.tap((vals) => {
    console.log(vals);
  }),
);

const switched = merge(
  a,
  a.pipe(switchMap((e) => (e === 0 ? EMPTY : of(e)))),
).pipe(batchSimultaneous, fromInstantaneous);

merged.subscribe(); */

type EventTree = { [key: string]: EventTree | r.Observable<unknown> } | r.Observable<unknown>;

function createRecursiveProxy<T extends EventTree>(
  getObj: () => T,
  originalTarget: unknown = {},
  props: string[] = [],
) {
  return new Proxy<T>(originalTarget as T, {
    get(target, prop, receiver) {
      const tryit = (originalTarget as any)[prop];
      if (tryit !== undefined) {
        return tryit;
      }
      const obs = r.defer(() => {
        const obj = getObj();
        return [...props, prop as string].reduce(
          (acc, prev) => (acc as never)[prev],
          obj,
        ) as unknown as r.Observable<unknown>;
      });

      const obj = createRecursiveProxy(getObj, obs, [...props, prop as string]);
      return obj;
    },
  });
}

const proxy = createRecursiveProxy(() => myTree);

const output = r.merge(proxy.a, proxy.b.c).pipe(r.map((val) => val * 2));

const myTree = {
  a: r.of(314).pipe(r.delay(1000)),
  b: {
    c: r.of(122).pipe(r.delay(3000)),
  },
}


output.subscribe((val) => {
  console.log(val)
});