import * as r from "rxjs";
import Observable = r.Observable;
import Subject = r.Subject;
import {
  Instantaneous,
  InstClose,
  InstEmit,
  InstInit,
  InstInitChild,
  InstInitMerge,
  InstInitPlain,
  InstValPlain,
  isInit,
  isVal,
  mapVal,
} from "./types";
import { Async, batchSync, Sync } from "../batch-sync";
import ArrayKeyedMap from "array-keyed-map";
import range from "lodash/range";
import zip from "lodash/zip";
import { InstantSubject } from "./constructors";

export const of = <As extends unknown[]>(...a: As): Instantaneous<As[number]> => {
  const provenance = Symbol();
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
    } satisfies InstClose
  );
};

export const share = <A>(inst: Instantaneous<A>): Instantaneous<A> => {
  if ("nextInternal" in inst) {
    return inst;
  }
  const subj = new Subject<InstEmit<A>>();
  let isSubscribed = false;
  let init: InstInit | undefined;
  return r.defer(() => {
    let subscription: r.Subscription;
    if (!isSubscribed) {
      subscription = inst.subscribe({
        next: (emit) => {
          if (!init) {
            init = emit as InstInit;
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
    if (init !== undefined) {
      return subj.pipe(
        r.startWith(init),
        r.finalize(() => subscription.unsubscribe())
      );
    }
    return subj.pipe(r.finalize(() => subscription.unsubscribe()));
  });
};

export const map =
  <A, B>(fn: (a: A) => B) =>
  (inst: Instantaneous<A>): Instantaneous<B> => {
    return inst.pipe(
      r.map((a) =>
        isVal(a)
          ? mapVal(
              a,
              (rootVal): InstValPlain<B> => ({
                ...rootVal,
                value: fn(rootVal.value),
              })
            )
          : a
      )
    );
  };

export const take =
  (takeNum: number) =>
  <A>(inst: Instantaneous<A>): Instantaneous<A> => {
    let init: InstInit | undefined;
    return r.concat(
      inst.pipe(
        r.map((a) => {
          if (isInit(a)) {
            init = a;
            const addTake = (init: InstInit): InstInit => {
              switch (init.type) {
                case "init":
                  return { ...init, take: init.take === undefined ? takeNum : Math.min(init.take, takeNum) };
                case "init-child":
                  return {
                    ...init,
                    own: addTake(init.own),
                  } satisfies InstInitChild;
                case "init-merge":
                  return {
                    ...init,
                    take: init.take === undefined ? takeNum : Math.min(init.take, takeNum),
                    children: init.children,
                  } satisfies InstInitMerge;
              }
            };
            return addTake(a);
          }
          return a;
        }),
        r.take(takeNum)
      ),
      r.of({ type: "close", init: init as InstInit } satisfies InstClose)
    );
  };

export const fromInstantaneous: <A>(obs: Instantaneous<A>) => r.Observable<A> = r.pipe(
  r.filter((emit) => emit.type === "value" || emit.type === "value-sync"),
  r.mergeMap((emit) => (emit.type === "value" ? r.of(emit.value) : r.of(...emit.values)))
);
