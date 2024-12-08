import type { Observable } from "rxjs";
import * as r from "rxjs";

export const createAsyncStart = (): Observable<unknown> => r.of(null).pipe(r.observeOn(r.asapScheduler));
