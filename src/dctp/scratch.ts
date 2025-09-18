import { merge } from "./v5/util";
import { cold } from "./v5/constructors";
import { fromInstantaneous, map, share } from "./v5/basic-primitives";
import { batchSimultaneous } from "./v5/batch-simultaneous";

const a = cold<number>((subscriber) => {
  let count = 0;
  setInterval(() => {
    if (count > 2) {
      subscriber.complete();
    }
    subscriber.next(count++);
  }, 1000);
}).pipe(share);

const merged = merge(a, a.pipe(map((n) => n * 2)));

const batched = batchSimultaneous(merged);

batched.pipe(fromInstantaneous).subscribe(console.log);
