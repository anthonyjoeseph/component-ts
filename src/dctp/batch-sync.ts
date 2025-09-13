import * as r from "rxjs";

export type Sync<A> = {
  type: "sync";
  value: A[];
};
export type Async<A> = {
  type: "async";
  value: A;
};

export const batchSync =
  <A>(): r.OperatorFunction<A, Sync<A> | Async<A>> =>
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
          return r.of({ type: "async" as const, value: val });
        })
      ),
      r.defer(() => {
        isSync = false;
        return r.of({ type: "sync" as const, value: coldVals });
      })
    );
  };
