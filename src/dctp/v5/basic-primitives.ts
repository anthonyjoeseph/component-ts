import * as r from "rxjs";
import { v4 as uuid } from "uuid";
import Observable = r.Observable;
import Subject = r.Subject;
import {
  async,
  close,
  init,
  Instantaneous,
  InstAsync,
  InstClose,
  InstEmit,
  InstInit,
  InstVal,
  isInit,
  map as mapPrimitive,
  val,
  values,
} from "./types";

export const EMPTY = r.defer(() => of());

export const of = <As extends unknown[]>(...a: As): Instantaneous<As[number]> => {
  const provenance = uuid() as unknown as symbol;

  return r.of(
    init<As[number]>({
      provenance,
      children: [...a.map(val), close],
    })
  );
};

export const share = <A>(inst: Instantaneous<A>): Instantaneous<A> => {
  if ("internalSubject" in inst) {
    return inst;
  }
  const subj = new Subject<InstEmit<A>>();
  let isSubscribed = false;
  let init: InstInit<A> | undefined;
  let subscription: r.Subscription;
  return r.defer(() => {
    if (init !== undefined) {
      return subj.pipe(
        r.startWith(init),
        r.finalize(() => {
          subscription?.unsubscribe();
        })
      );
    }
    return r.merge(
      subj,
      r.defer(() => {
        if (!isSubscribed) {
          subscription = inst.subscribe({
            next: (emit) => {
              if (!init) {
                init = emit as InstInit<A>;
              }
              subj.next(emit);
            },
            error: (err) => {
              subj.error(err);
            },
            complete: () => {
              subj.complete();
            },
          });
          isSubscribed = true;
        }
        return r.EMPTY;
      })
    );
  });
};

export const map =
  <A, B>(fn: (a: A) => B) =>
  (inst: Instantaneous<A>): Instantaneous<B> => {
    return inst.pipe(r.map((a) => mapPrimitive(a, fn) as InstEmit<B>));
  };

export const accumulate = <A>(initial: A): ((val: Instantaneous<(a: A) => A>) => Instantaneous<A>) => {
  let value = initial;
  return map((fn) => {
    const newValue = fn(value);
    value = newValue;
    return newValue;
  });
};

export const take =
  (takeNum: number) =>
  <A>(inst: Instantaneous<A>): Instantaneous<A> => {
    let provenance: symbol;
    let numSyncEmissions: number;
    return r.concat(
      inst.pipe(
        r.tap((a) => {
          if (isInit(a)) {
            provenance = a.provenance;
            numSyncEmissions = a.children.filter((c) => c.type === "value").length;
          }
        }),
        r.take(takeNum + 1 - numSyncEmissions!) // add one for the 'init' emission
      ),
      r.of({
        type: "async",
        provenance: provenance!,
        child: { type: "close" } satisfies InstClose,
      } satisfies InstAsync<A>)
    );
  };

export const fromInstantaneous: <A>(obs: Instantaneous<A>) => r.Observable<A> = r.pipe(
  r.mergeMap((emit) => {
    const allVals = values(emit);
    return r.of(...allVals);
  })
);
