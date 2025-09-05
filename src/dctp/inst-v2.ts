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
  provenance: symbol;
};

export type InstVal<A> = {
  type: "value";
  provenance: symbol;
  count: number;
  value: A;
};

export type InstFiltered = {
  type: "filtered";
  provenance: symbol;
  count: number;
};

export type InstEmit<A> = InstInit | InstFiltered | InstVal<A>;
export type Instantaneous<A> = r.Observable<InstEmit<A>>;

export const instantaneous = <A>(obs: r.Observable<A>): Instantaneous<A> => {
  const provenance = Symbol();
  return obs.pipe(
    r.map(
      (value): InstVal<A> => ({
        type: "value",
        provenance,
        value,
        count: 1,
      })
    ),
    r.startWith({ type: "init", provenance } as InstInit)
  );
};

const mergeMap = <A, B>(fn: (a: A) => Instantaneous<B>): ((obs: Instantaneous<A>) => Instantaneous<B>) => {
  return (obs) => {
    return null;
  };
};

const merge2 = <A>(obss: Instantaneous<A>[]): Instantaneous<A> => {
  const f = r.of(...obss);
  return f.pipe(mergeMap((a) => a));
};

export const merge = <A>(obss: Instantaneous<A>[]): Instantaneous<A> => {
  const extraCounts: Record<symbol, number> = {};
  const handleInit = (emit: InstEmit<A>) => {
    if (emit.type === "init") {
      const prov = emit.provenance;
      if (extraCounts[prov] === undefined) {
        extraCounts[prov] = 0;
      } else {
        extraCounts[prov]++;
      }
    }
  };
  return r.merge(...obss).pipe(
    batchSync(),
    r.mergeMap((batch): Instantaneous<A> => {
      if (batch.type === "sync") {
        batch.value.forEach(handleInit);
        return r.of(...batch.value);
      } else {
        handleInit(batch.value);
        return r.of(batch.value);
      }
    }),
    r.map((emit) => {
      if (emit.type === "value" || emit.type === "filtered") {
        return {
          ...emit,
          count: emit.count + (extraCounts[emit.provenance] as number),
        };
      } else {
        return emit;
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
          currentCount: emit.count,
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
          count: emit.count,
          provenance: provenance,
        });

      return r.of({
        type: "value",
        count: emit.count,
        provenance: provenance,
        value: currentBatch?.batch as A[],
      } as InstEmit<A[]>);
    })
  );
};

export const fromInstantaneous: <A>(obs: Instantaneous<A>) => r.Observable<A> = r.pipe(
  r.filter((emit) => emit.type === "value"),
  r.map((emit) => emit.value)
);

export const map = <A, B>(fn: (val: A) => B): ((val: Instantaneous<A>) => Instantaneous<B>) => {
  return (obs) => obs.pipe(r.map((emit) => (emit.type === "value" ? { ...emit, value: fn(emit.value) } : emit)));
};

export const filter = <A, B>(fn: (val: A) => B): ((val: Instantaneous<A>) => Instantaneous<B>) => {
  return (obs) => obs.pipe(r.map((emit) => (emit.type === "value" ? { ...emit, value: fn(emit.value) } : emit)));
};
