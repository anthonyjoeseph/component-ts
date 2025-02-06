import * as r from "rxjs";

export function doOnSubscribe<T>(onSubscribe: () => void): (source: r.Observable<T>) => r.Observable<T> {
  return function inner(source: r.Observable<T>): r.Observable<T> {
    return r.defer(() => {
      onSubscribe();
      return source;
    });
  };
}

const closeAfterSync =
  <A>(): r.MonoTypeOperatorFunction<A> =>
  (ob) => {
    const closer = new r.Subject<void>();
    return r
      .merge(
        ob,
        r.defer(() => {
          closer.next();
          return r.EMPTY;
        })
      )
      .pipe(
        r.takeUntil(closer),
        r.finalize(() => closer.complete())
      );
  };

/* const subj2 = new r.Subject<number>();
setTimeout(() => {
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
}, 1000); */

const printEndOfFrame = <A>(obs: r.Observable<A>): r.Observable<A | string> => {
  const all = new r.ReplaySubject<A>();
  const retval = new r.Subject<A | string>();

  return r.defer(() => {
    return r.merge(
      retval,
      r.defer(() => {
        let subscription: r.Subscription;
        let totalEmissions = 0;

        obs.pipe(r.observeOn(r.queueScheduler)).subscribe(all);

        r.queueScheduler.schedule<A>(function (this) {
          const recurse = () => this.schedule();

          if (!!subscription && !subscription.closed) {
            subscription.unsubscribe();
          }

          // catch all current sync emissions
          subscription = all.pipe(r.skip(totalEmissions)).subscribe((a) => {
            retval.next(a);
            totalEmissions++;
          });
          subscription.unsubscribe();
          retval.next("\nend frame\n------------\n");

          // catch next sync emission
          subscription = all.pipe(r.skip(totalEmissions)).subscribe((a) => {
            totalEmissions++;
            retval.next(a);
            r.queueScheduler.schedule(() => {
              recurse();
            });
          });
        });

        return r.EMPTY;
      })
    );
  });
};

const syncAfterDelay = r.of(0).pipe(
  r.delay(0),
  r.mergeMap(() => {
    return r.of("one", "two");
  })
);

// printEndOfFrame(syncAfterDelay).subscribe(console.log);

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

const dest8 = source.pipe(r.map((a) => a * -1));
const dest9 = source.pipe(r.map((a) => a * 2));

const joined2 = batchSyncWorks([dest8, dest9]).pipe(r.map((d) => `[${d.map(String).join(", ")}]`));

// joined2.subscribe(console.log);
