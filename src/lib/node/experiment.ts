import * as r from "rxjs";

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

gatherSync([r.of(123), r.of(456), r.of(789)]).subscribe(console.log);
