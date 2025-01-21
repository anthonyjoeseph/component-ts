import type { Observable } from "rxjs";
import * as r from "rxjs";

export const createAsyncStart = (): Observable<unknown> => r.of(null).pipe(r.observeOn(r.asapScheduler));

export const sum = (nums: number[]): number => nums.reduce((acc, cur) => acc + cur, 0);
export const range = (start: number, end: number) =>
  new Array<number>(end - start).fill(0).map((_, index) => start + index);

export type Sync<A> = {
  type: "sync";
  value: A[];
};
export type Async<A> = {
  type: "async";
  value: A;
};

export const gatherSync = <A>(obs: r.Observable<A>[]): r.Observable<Sync<A> | Async<A>> => {
  let isSync = true;
  const sync: Sync<A> = { type: "sync", value: [] };

  return r.merge(
    r.merge(...obs).pipe(
      r.mergeMap((val) => {
        if (isSync) {
          sync.value.push(val as A);
          return r.EMPTY;
        }
        return r.of({
          type: "async",
          value: val,
        } as Async<A>);
      })
    ),
    r.defer(() => {
      isSync = false;
      return r.of(sync);
    })
  );
};
