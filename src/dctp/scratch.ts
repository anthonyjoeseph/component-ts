import { cold, InstantSubject } from "./v5/constructors";
import { fromInstantaneous, map, of, EMPTY, share } from "./v5/basic-primitives";
import { batchSimultaneous } from "./v5/batch-simultaneous";
import { mergeAll } from "./v5/joins";
import { merge, switchMap } from "./v5/util";
import * as r from "rxjs";

const a = cold<number>((subscriber) => {
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
  })
);

/* const switched = merge(a, a.pipe(switchMap((e) => (e === 0 ? EMPTY : of(e))))).pipe(
  batchSimultaneous,
  fromInstantaneous
); */

merged.subscribe();
