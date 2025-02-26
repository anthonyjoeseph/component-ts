import * as r from "rxjs";
import * as i from "./instantaneous";

import Observable = r.Observable;
import Instantaneous = i.Instantaneous;

const a = i.create(
  r.of(null).pipe(
    r.delay(0),
    r.mergeMap(() => r.of(1, 2, 3)),
    r.share()
  ),
  false
);

const merged = i.merge2(a, a);

const batched = i.batchSimultaneous(merged);

merged.subscribe(console.log);
