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

export const batchColdSync =
  <A>(): r.OperatorFunction<A, A[]> =>
  (ob) => {
    let isSync = true;
    const coldVals: A[] = [];

    return r.merge(
      ob.pipe(
        r.mergeMap((val) => {
          if (isSync) {
            coldVals.push(val);
            return r.EMPTY;
          }
          return r.of([val]);
        })
      ),
      r.defer(() => {
        isSync = false;
        return r.of(coldVals);
      })
    );
  };

export const batchSync =
  <A>(): r.OperatorFunction<A, A[]> =>
  (ob) => {
    const batch: A[] = [];
    let isSync = true;
    let isAsync = false;
    const endOfMicrotask = r.of(null).pipe(r.observeOn(r.queueScheduler));

    return r.merge(
      ob.pipe(
        r.observeOn(r.queueScheduler),
        r.mergeMap((val) => {
          if (isSync || isAsync) {
            batch.push(val);
            return r.EMPTY;
          }
          isAsync = true;
          batch.push(val);
          return endOfMicrotask.pipe(
            r.mergeMap(() => {
              isAsync = false;
              if (batch.length === 0) return r.EMPTY;
              const retval = [...batch];
              batch.splice(0, batch.length);
              return r.of(retval);
            })
          );
        })
      ),
      r.defer(() => {
        isSync = false;
        if (batch.length === 0) return r.EMPTY;
        const retval = [...batch];
        batch.splice(0, batch.length);
        return r.of(retval);
      })
    );
  };
