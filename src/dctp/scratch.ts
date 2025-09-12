import * as r from "rxjs";
import * as i from "./inst-v2";

import Observable = r.Observable;
import Instantaneous = i.Instantaneous;

/* const a = i.instantaneous(
  r.of(null).pipe(
    r.delay(0),
    r.mergeMap(() => r.of(1, 2, 3)),
    r.share()
  )
);

const merged = i.merge([a, a.pipe(i.map((n) => n * 2))]);

const batched = i.batchSimultaneous(merged);

batched.pipe(i.fromInstantaneous).subscribe(console.log); */
