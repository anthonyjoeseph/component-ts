import * as r from "rxjs";
import { v4 as uuid } from "uuid";
import Observable = r.Observable;
import Subject = r.Subject;
import {
  Instantaneous,
  InstClose,
  InstEmit,
  InstInit,
  InstInitChild,
  InstInitPlain,
  InstValPlain,
  isInit,
  isVal,
  mapInit,
  mapVal,
} from "./types";

export const EMPTY = r.defer(() => of());

export const of = <As extends unknown[]>(...a: As): Instantaneous<As[number]> => {
  const provenance = uuid() as unknown as symbol;
  return r.of(
    {
      type: "init",
      provenance,
    } satisfies InstInitPlain,
    ...a.map(
      (value) =>
        ({
          type: "value",
          init: {
            type: "init",
            provenance,
          } satisfies InstInitPlain,
          value,
        }) satisfies InstValPlain<As[number]>
    ),
    {
      type: "close",
      init: {
        type: "init",
        provenance,
      } satisfies InstInitPlain,
    } satisfies InstClose<As[number]>
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
    return inst.pipe(
      r.map((a) =>
        isVal(a)
          ? mapVal(a, fn)
          : isInit(a)
            ? a
            : ({ type: "close", init: mapInit(a.init, (as) => as.map(fn)) } satisfies InstClose<B>)
      )
    );
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
    let init: InstInit<A> | undefined;
    return r.concat(
      inst.pipe(
        r.map((a) => {
          if (isInit(a)) {
            init = a;
            const addTake = (init: InstInit<A>): InstInit<A> => {
              switch (init.type) {
                case "init":
                  return { ...init, take: init.take === undefined ? takeNum : Math.min(init.take, takeNum) };
                case "init-child":
                  return {
                    ...init,
                    init: addTake(init.init),
                  } satisfies InstInitChild<A>;
              }
            };
            return addTake(a);
          }
          return a;
        }),
        r.take(takeNum)
      ),
      r.of({ type: "close", init: init as InstInit<A> } satisfies InstClose<A>)
    );
  };

export const fromInstantaneous: <A>(obs: Instantaneous<A>) => r.Observable<A> = r.pipe(
  r.filter((emit) => emit.type === "value" || emit.type === "init-child"),
  r.mergeMap((emit) => (emit.type === "value" ? r.of(emit.value) : r.of(...emit.syncVals)))
);
