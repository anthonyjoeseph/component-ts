import { merge } from "./v5/util";
import { cold, InstantSubject } from "./v5/constructors";
import { fromInstantaneous, map, share } from "./v5/basic-primitives";
import { batchSimultaneous } from "./v5/batch-simultaneous";
import { Observable } from "rxjs";

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

const merged = merge(a, a.pipe(map((n) => n * 2))).pipe(batchSimultaneous, fromInstantaneous);

merged.subscribe();
