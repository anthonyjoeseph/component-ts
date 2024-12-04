import type { Observable } from "rxjs";
import * as r from "rxjs";

export const asyncStart: Observable<unknown> = r.of(null).pipe(r.observeOn(r.asapScheduler));
