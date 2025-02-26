import * as r from "rxjs";
import { v7 as uuid } from "uuid";

import Observable = r.Observable;

type ProvCallback = (p: symbol, action: "add" | "remove") => void;
export interface Instantaneous<A> extends r.Observable<Instant<A>> {
  ownProvenance: symbol;
  subscriptionProvenances: Record<symbol, number>;
  provListeners: ProvCallback[];
  registerProvListener: (callback: ProvCallback) => void;
}
const initInstantaneous = <A>(o: Observable<A>): void => {
  const i = o as unknown as Instantaneous<A>;
  i.ownProvenance = uuid() as unknown as symbol;
  i.subscriptionProvenances = {};
  i.provListeners = [];
  i.registerProvListener = (callback) => {
    i.provListeners.push(callback);
  };
};

export type InstantAfter = { type: "after"; provenance: symbol };
export type InstantValue<A> = { type: "value"; value: A; provenance: symbol };
export type Instant<A> = InstantAfter | InstantValue<A>;

export const merge2 = <A>(a: Instantaneous<A>, b: Instantaneous<A>): Instantaneous<A> => {
  const c = r.merge(a, b);
  initInstantaneous(c);
  const i = c as Instantaneous<A>;
  const provCallback: ProvCallback = (prov, action) => {
    if (action === "add") {
      i.subscriptionProvenances[prov] = (i.subscriptionProvenances[prov] ?? 0) + 1;
    } else {
      i.subscriptionProvenances[prov]!--;
    }
  };
  a.registerProvListener(provCallback);
  b.registerProvListener(provCallback);
  return i;
};

export const create = <A>(a: r.Observable<A>, isCold: boolean): Instantaneous<A> => {
  initInstantaneous(a);
  const hotProvenance = uuid() as unknown as symbol;
  const ret = pipeInst(a)(
    r.scan(
      (acc, cur) => {
        if (!acc) {
          const i = a as unknown as Instantaneous<A>;
          let provenance: symbol;
          if (isCold) {
            provenance = uuid() as unknown as symbol;
            i.subscriptionProvenances = {
              ...i.subscriptionProvenances,
              [provenance]: 1,
            };
          } else {
            provenance = hotProvenance;
          }
          for (const pl of i.provListeners) {
            pl(provenance, "add");
          }
          return { type: "value" as "value", value: cur, provenance };
        }
        return { type: "value" as "value", value: cur, provenance: acc.provenance };
      },
      undefined as unknown as Instant<A>
    ),
    r.mergeMap((ins) => r.of(ins, { type: "after", provenance: ins.provenance } as InstantAfter)),
    finalizeWithValue((finalEmission) => {
      if (finalEmission) {
        const { provenance } = finalEmission;
        const i = a as unknown as Instantaneous<A>;
        for (const pl of i.provListeners) {
          pl(provenance, "remove");
        }
        i.subscriptionProvenances[provenance]!--;
      }
    })
  ) as Instantaneous<A>;
  return ret;
};

export const consume = <A>(a: Instantaneous<A>): r.Observable<A> =>
  a.pipe(
    r.filter((e): e is InstantValue<A> => e.type === "value"),
    r.map((e) => e.value)
  );

export const batchSimultaneous = <A>(a: Instantaneous<A>): Instantaneous<A[]> => {
  return pipeInst(a)(
    r.scan(
      (
        acc,
        cur
      ): {
        batches: Record<symbol, { remaining: number; batch: A[] }>;
        current: Instant<A>;
      } => {
        const existing = acc.batches[cur.provenance];
        if (cur.type === "value") {
          if (!existing || existing.remaining === 0) {
            return {
              batches: {
                ...acc.batches,
                [cur.provenance]: { remaining: a.subscriptionProvenances[cur.provenance]!, batch: [cur.value] },
              },
              current: cur,
            };
          } else {
            return {
              batches: {
                ...acc.batches,
                [cur.provenance]: { remaining: existing.remaining + 1, batch: [...existing.batch, cur.value] },
              },
              current: cur,
            };
          }
        }
        return {
          batches: {
            ...acc.batches,
            [cur.provenance]: { remaining: existing!.remaining - 1, batch: existing!.batch },
          },
          current: cur,
        };
      },
      {
        batches: {} as Record<symbol, { remaining: number; batch: A[] }>,
        current: undefined as unknown as Instant<A>,
      }
    ),
    r.filter((a): boolean => {
      return a.current.type === "after" && a.batches[a.current.provenance]!.remaining === 0;
    }),
    r.mergeMap((a): Instantaneous<A[]> => {
      return r.of(
        {
          type: "value",
          provenance: a.current.provenance,
          value: a.batches[a.current.provenance]!.batch,
        } as InstantValue<A[]>,
        { type: "after", provenance: a.current.provenance } as InstantAfter
      ) as Instantaneous<A[]>;
    })
  ) as Instantaneous<A[]>;
};

// https://stackoverflow.com/a/70722380
function finalizeWithValue<T>(callback: (value: T | undefined) => void) {
  return (source: r.Observable<T>) =>
    r.defer(() => {
      let lastValue: T;
      return source.pipe(
        r.tap((value) => (lastValue = value)),
        r.finalize(() => callback(lastValue))
      );
    });
}

type PipeInstant<A> = Observable<A>["pipe"];
export const pipeInst =
  <A>(i: Observable<A>): PipeInstant<A> =>
  (...fns: any[]) => {
    if (fns.length === 0) {
      return i;
    }

    if (fns.length === 1) {
      const withProv = fns[0](i);
      withProv.subscriptionProvenances = (i as unknown as Instantaneous<A>).subscriptionProvenances;
      withProv.provListeners = (i as unknown as Instantaneous<A>).provListeners;
      withProv.registerProvListener = (i as unknown as Instantaneous<A>).registerProvListener;
      return;
    }

    const withProv = fns.reduce((prev: any, fn: (a: any) => any) => fn(prev), i);
    withProv.subscriptionProvenances = (i as unknown as Instantaneous<A>).subscriptionProvenances;
    withProv.provListeners = (i as unknown as Instantaneous<A>).provListeners;
    withProv.registerProvListener = (i as unknown as Instantaneous<A>).registerProvListener;
    return withProv;
  };
