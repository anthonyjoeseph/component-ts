import { merge } from "./v5/util";
import { cold, InstantSubject } from "./v5/constructors";
import { fromInstantaneous, map, share } from "./v5/basic-primitives";
import { batchSimultaneous } from "./v5/batch-simultaneous";
import { Observable } from "rxjs";

/* const a = cold<number>((subscriber) => {
  let count = 0;
  const intervalId = setInterval(() => {
    if (count > 2) {
      subscriber.complete();
      intervalId.close();
    }
    subscriber.next(count++);
  }, 1000);
}).pipe(share); */

// FIX:
// this only 'closes' once
// the above closes twice, which is good
// not sure exactly what the difference is

const a = new InstantSubject<number>();

let count = 0;
const intervalId = setInterval(() => {
  if (count > 2) {
    a.complete();
    intervalId.close();
  } else {
    a.next(count++);
  }
}, 1000);

// const merged = merge(a, a.pipe(map((n) => n * 2))).pipe(batchSimultaneous, fromInstantaneous);

a.subscribe((instEmit) => {
  console.log(instEmit);
});

setTimeout(() => {
  a.subscribe((instEmit) => {
    console.log(instEmit);
  });
}, 1500);
