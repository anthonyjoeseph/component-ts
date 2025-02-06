import * as r from "rxjs";
import { TrimmableReplaySubject } from "./TrimmableReplaySubject";

let unused: any = TrimmableReplaySubject;

const test0 = new TrimmableReplaySubject<number>();

export function doOnSubscribe<T>(onSubscribe: () => void): (source: r.Observable<T>) => r.Observable<T> {
  return function inner(source: r.Observable<T>): r.Observable<T> {
    return r.defer(() => {
      onSubscribe();
      return source;
    });
  };
}

const withD = <A>(ob: r.Observable<A>) =>
  r.of(null).pipe(
    r.delay(2000),
    r.mergeMap(() => ob)
  );

r.combineLatest([withD(r.of(0, 1, 2)), withD(r.of("a", "b", "c")), withD(r.of("x", "y", "z"))]); // .subscribe(console.log);

const closeAfterSync =
  <A>(): r.MonoTypeOperatorFunction<A> =>
  (ob) => {
    return r.defer(() => {
      const closer = new r.Subject<void>();
      unused = test0;
      return r
        .merge(
          ob,
          r.defer(() => {
            unused = test0;
            closer.next();
            return r.EMPTY;
          })
        )
        .pipe(
          r.takeUntil(closer),
          r.finalize(() => closer.complete())
        );
    });
  };

const subj2 = new r.Subject<number>();
r.merge(
  subj2,
  r.defer(() => {
    subj2.next(0);
    subj2.next(1);
    subj2.next(2);
    setTimeout(() => subj2.next(3), 0);
    return r.EMPTY;
  })
)
  .pipe(closeAfterSync())
  .subscribe(console.log);

const batchSyncClosing =
  <A>(): r.OperatorFunction<A, A[]> =>
  (obs) => {
    let stuff = 0;
    const safe = obs; //.pipe(r.share({ resetOnRefCountZero: false }));
    const resub = new r.ReplaySubject<void>();

    const getFirstSync = safe.pipe(
      r.tap((val) => {
        stuff++;
      }),
      closeAfterSync(),
      r.toArray(),
      r.tap((val) => {
        stuff++;
      })
    );

    const firstAfterSync = r.concat(
      getFirstSync,
      safe.pipe(
        r.take(1),
        r.mergeMap(() => {
          return r.EMPTY;
        })
      ),
      safe.pipe(
        r.tap((val) => {
          stuff++;
        }),
        closeAfterSync(),
        r.toArray(),
        r.tap((val) => {
          stuff++;
        })
      )
    );

    return firstAfterSync;
  };

/* const t = r.timer(0, 1000).pipe(r.share());

r.merge(r.of(0, 1, 2), t, t, t)
  .pipe(batchSyncClosing())
  .subscribe(console.log); */

test0.next(0);
test0.next(1);
test0.next(2);
setTimeout(() => {
  test0.push(3);
  test0.push(4);
  test0.push(5);
  test0.next(Infinity);
}, 0);

test0.pipe(
  batchSyncClosing(),
  r.tap(() => {
    test0.empty();
  })
);
//.subscribe(console.log);

const batchSync =
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

const syncAfterDelay = r.timer(0, 1000).pipe(r.share());

r.merge(r.timer(0, 1000), syncAfterDelay, syncAfterDelay).pipe(batchSync()); //.subscribe(console.log);

const reverse = <A>(arr: A[]): A[] => [...arr].reverse();

const mergeSyncWeird = <A>(obs: r.Observable<A>[]): r.Observable<A[]> => {
  const batch: A[] = [];
  let latestIndex = 0;

  return r.merge(
    ...obs.map((ob, index) =>
      ob.pipe(
        r.mergeMap((val) => {
          if (index <= latestIndex) {
            batch.splice(0, batch.length);
          }
          batch.push(val);
          return r.of(batch);
        })
      )
    )
  );
};

const one = r.timer(0, 1000).pipe(r.share());
const two = r.timer(500, 1000).pipe(r.share());
const weird = mergeSyncWeird([
  one.pipe(r.map(() => 0)),
  one.pipe(r.map(() => 1)),
  two.pipe(r.map(() => 2)),
  two.pipe(r.map(() => 3)),
]);
// weird.subscribe(console.log);

const batchSyncWorks = <A>(obs: r.Observable<A>[]): r.Observable<A[]> => {
  const batch: A[] = [];
  const head = obs.slice(0, obs.length - 1);
  const last = (obs[obs.length - 1] ?? r.EMPTY).pipe(r.share());

  return r.merge(
    r.merge(...head, last).pipe(
      r.tap((a) => {
        batch.push(a);
      }),
      r.mergeMap(() => r.EMPTY)
    ),
    last.pipe(
      r.mergeMap(() => {
        const retval = r.of([...batch]);
        batch.splice(0, batch.length);
        return retval;
      })
    )
  );
};

// const source = r.of(0, 1, 2, 3, 4, 5);
const source = r.interval(1000);

const dest8 = source.pipe(r.mergeMap((a) => r.of(a * -1, a * -1)));
const dest9 = source.pipe(r.map((a) => a * 2));

const joined2 = batchSyncWorks([dest8, dest9]).pipe(r.map((d) => `[${d.map(String).join(", ")}]`));

// joined2.subscribe(console.log);
