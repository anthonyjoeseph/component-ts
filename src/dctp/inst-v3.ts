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

export type InstInit = {
  type: "init";
  initType:
    | {
        type: "normie";
      }
    | {
        type: "parent";
      }
    | {
        type: "child";
        parent: symbol;
      };
  provenance: symbol;
};

export type InstVal<A> = {
  type: "value";
  value: A;
  provenance: symbol;
  switchMapParent: symbol | null;
  selfMergeCount: number;
};

export type InstFiltered = {
  type: "filtered";
  provenance: symbol;
  switchMapParent: symbol | null;
  selfMergeCount: number;
};

export type InstEmit<A> = InstInit | InstFiltered | InstVal<A>;
export type Instantaneous<A> = r.Observable<InstEmit<A>>;

export const instantaneous = <A>(obs: r.Observable<A>): Instantaneous<A> => {
  const provenance = Symbol();
  return obs.pipe(
    r.map(
      (value): InstVal<A> => ({
        type: "value",
        provenance: provenance,
        switchMapParent: null,
        value,
        selfMergeCount: 1,
      })
    ),
    r.startWith({ type: "init", initType: { type: "normie" }, provenance } satisfies InstInit)
  );
};

export const fromInstantaneous: <A>(obs: Instantaneous<A>) => r.Observable<A> = r.pipe(
  r.filter((emit) => emit.type === "value"),
  r.map((emit) => emit.value)
);

export const of = <A>(...as: A[]): Instantaneous<A> => instantaneous(r.of(...as));

export const share = <A>(inst: Instantaneous<A>): Instantaneous<A> => inst.pipe(r.share());

export const empty: Instantaneous<never> = r.EMPTY;

export const map = <A, B>(fn: (val: A) => B): ((val: Instantaneous<A>) => Instantaneous<B>) => {
  return (obs) => obs.pipe(r.map((emit) => (emit.type === "value" ? { ...emit, value: fn(emit.value) } : emit)));
};

export const accumulate = <A>(initial: A): ((val: Instantaneous<(a: A) => A>) => Instantaneous<A>) => {
  let value = initial;
  return map((fn) => {
    const newValue = fn(value);
    value = newValue;
    return newValue;
  });
};

/**
 * we know that at subscribe-time we will get exactly one Init from each array member
 * and nested merges will still emit one init for each Instantaneous
 * (since switchMap filters the init out from its children)
 *
 * this means that we're able to view which members of obss share a provenance (siblings)
 * at subscribe-time, before anything actually emits
 *
 * so we annotate each omission with how many siblings are shared
 *
 * we throw out any incoming value of selfMergeCount - it might be higher than 1
 * if there are nested merges, but the outermost merge will be aware of
 * the biggest superset of siblings
 */
export const merge = <A>(obss: Instantaneous<A>[]): Instantaneous<A> => {
  const numWithProvenance: Record<symbol, number> = {};
  const parentsByProvenance: Record<symbol, { count: number; numChildrenWithProvenance: Record<symbol, number> }> = {};
  return r.merge(...obss).pipe(
    batchSync(),
    r.mergeMap((batch): Instantaneous<A> => {
      if (batch.type === "sync") {
        batch.value.forEach((emit: InstEmit<A>) => {
          if (emit.type === "init") {
            const prov = emit.provenance;
            switch (emit.initType.type) {
              case "normie":
                const num = numWithProvenance[prov];
                numWithProvenance[prov] = (num ?? 0) + 1;
                break;
              case "parent":
                if (parentsByProvenance[prov] === undefined) {
                  parentsByProvenance[prov] = {
                    count: 1,
                    numChildrenWithProvenance: {},
                  };
                } else {
                  parentsByProvenance[prov].count++;
                }
                break;
              case "child":
                const numChildren =
                  parentsByProvenance[emit.initType.parent]!.numChildrenWithProvenance[emit.provenance];
                parentsByProvenance[emit.initType.parent]!.numChildrenWithProvenance[emit.provenance] =
                  (numChildren ?? 0) + 1;
                break;
            }
          }
        });
        return r.of(...batch.value);
      } else {
        return r.of(batch.value);
      }
    }),
    r.map((emit) => {
      if (emit.type === "value" || emit.type === "filtered") {
        const parentInfo = emit.switchMapParent != null ? parentsByProvenance[emit.switchMapParent] : undefined;
        if (parentInfo !== undefined) {
          const numSiblings = parentInfo.numChildrenWithProvenance[emit.provenance] ?? 1;
          return {
            ...emit,
            selfMergeCount: numSiblings,
          };
        }
        const numSiblings = numWithProvenance[emit.provenance] ?? 1;
        return {
          ...emit,
          selfMergeCount: numSiblings,
        };
      } else {
        return emit;
      }
    })
  );
};

/**
 * parents siblings includes self
 * merge(a, switchMap(b, () => a))
 *
 * multiple relevant parents
 * merge(a, b, switchMap(merge(a, b), () => c), switchMap(merge(a, b), () => c))
 *
 * shared parents, unrelated emissions
 * merge(a, switchMap(a, () => b), switchMap(a, () => c))
 *
 */

/**
 * switchMap<A, B>(
 *   parent: Observable<A>,
 *   createChildFn: (a: A): Observable<B>
 * )
 * ^--- this is what I mean by "parent" and "child"
 *
 * When we switchmap, we lose all of the emissions of the parent.
 * This confounds our counting! If two observables share a provenance,
 * but one is switchMapped into a filter that never emits,
 * then batchSimultaneous will wait forever to emit anything
 *
 * So, we need to emit a "filtered" event on every parent emission,
 * in order to keep our count honest
 *
 * ---
 *
 * We also introduce asynchronicity into our "Init" events - child observables
 * can emit "Init" asynchronously (the vast majority do!)
 *
 * This is a problem, since `merge` relies on all init events to be synchronous
 *
 * So, switchMap acts as a boundary - all child inits are filtered out
 *
 * Instead, child values & filters are given a 'parent provenance', which represents the
 * provenance of our parent observable (in fact, there might be many if the
 * parent is the result of a merge)
 *
 * This allows our parents to function as the actual source of provenance
 * They are guaranteed to init synchronously
 *
 * Outer merges that are listening will look to see if they own any of the parents
 * (they will only own at most one relevant parent)
 */
export const switchMap =
  <A, B>(childFn: (emission: A) => Instantaneous<B>) =>
  (parentObs: Instantaneous<A>): Instantaneous<B> => {
    return parentObs.pipe(
      r.switchMap((parent) => {
        if (parent.type === "init") {
          return r.of({ ...parent, initType: { type: "parent" } } satisfies InstInit);
        } else if (parent.type === "filtered") {
          return r.of(parent satisfies InstFiltered);
        } else {
          return r.merge(
            r.of({
              type: "filtered",
              provenance: parent.provenance,
              selfMergeCount: parent.selfMergeCount,
              switchMapParent: parent.switchMapParent,
            } satisfies InstFiltered),
            childFn(parent.value).pipe(
              r.map((child): InstEmit<B> => {
                if (child.type === "init") {
                  return {
                    type: "init",
                    initType: { type: "child", parent: parent.provenance },
                    provenance: child.provenance,
                  } satisfies InstInit;
                } else if (child.type === "filtered") {
                  return {
                    ...child,
                    switchMapParent: parent.provenance,
                  } satisfies InstFiltered;
                }
                return {
                  type: "value",
                  value: child.value,
                  provenance: child.provenance,
                  selfMergeCount: child.selfMergeCount,
                  switchMapParent: parent.provenance,
                } satisfies InstVal<B>;
              })
            )
          );
        }
      })
    );
  };

export const batchSimultaneous = <A>(obs: Instantaneous<A>): Instantaneous<A[]> => {
  let currentBatches: Record<
    symbol,
    {
      batch: A[];
      currentCount: number;
    }
  > = {};
  return obs.pipe(
    r.mergeMap((emit): Instantaneous<A[]> => {
      if (emit.type === "init") return r.of(emit);
      const provenance = emit.provenance;
      if (currentBatches[provenance] === undefined) {
        currentBatches[provenance] = {
          batch: emit.type === "filtered" ? [] : [emit.value],
          currentCount: emit.selfMergeCount,
        };
      } else {
        currentBatches[provenance].batch.push(...(emit.type === "filtered" ? [] : [emit.value]));
        currentBatches[provenance].currentCount--;
      }
      if (currentBatches[provenance].currentCount > 1) return r.EMPTY;

      const { [provenance]: currentBatch, ...rest } = currentBatches;

      // delete the current batch
      currentBatches = rest;
      if (currentBatch?.batch.length === 0)
        return r.of({
          type: "filtered",
          provenance,
          switchMapParent: emit.switchMapParent,
          selfMergeCount: emit.selfMergeCount,
        } satisfies InstFiltered);

      return r.of({
        type: "value",
        value: currentBatch?.batch as A[],
        switchMapParent: emit.switchMapParent,
        selfMergeCount: emit.selfMergeCount,
        provenance,
      } satisfies InstEmit<A[]>);
    })
  );
};
