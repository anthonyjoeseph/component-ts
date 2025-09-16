import * as r from "rxjs";
import Observable = r.Observable;
import Subject = r.Subject;
import { batchSync } from "./batch-sync";
import ArrayKeyedMap from "array-keyed-map";

export type InstInitPlain = {
  type: "init";
  provenance: symbol;
  take?: number;
};

export type InstInitMerge = {
  type: "init-merge";
  take?: number;
  children: InstInit[];
};

export type InstInitChild = {
  type: "init-child";
  parent: InstInit;
  own: InstInit;
};

export type InstValPlain<A> = {
  type: "value";
  value: A;
  init: InstInit;
};

export type InstValFiltered = {
  type: "value-filtered";
  init: InstInit;
};

export type InstClose = {
  type: "close";
  init: InstInit;
};

export type InstInit = InstInitPlain | InstInitMerge | InstInitChild;

export type InstVal<A> = InstValPlain<A> | InstValFiltered;

export type InstEmit<A> = InstInit | InstVal<A> | InstClose;

export type Instantaneous<A> = Observable<InstEmit<A>>;

export const isInit = <A>(a: InstEmit<A>): a is InstInit => {
  return a.type === "init" || a.type === "init-merge" || a.type === "init-child";
};

export const isVal = <A>(a: InstEmit<A>): a is InstVal<A> => {
  return a.type === "value" || a.type === "value-filtered";
};

export const mapVal = <A, B>(a: InstVal<A>, fn: (i: InstValPlain<A>) => InstValPlain<B>): InstVal<B> => {
  switch (a.type) {
    case "value":
      return {
        ...a,
        value: undefined,
      } as InstVal<never>;
    case "value-filtered":
      return a;
  }
};

export const cold = <T>(
  subscribe?: (this: Observable<T>, subscriber: r.Subscriber<T>) => r.TeardownLogic
): Instantaneous<T> => {
  const provenance = Symbol();
  return r.concat(
    r.of({
      type: "init",
      provenance,
    } satisfies InstInitPlain),
    new Observable(subscribe).pipe(
      r.map(
        (value) =>
          ({
            type: "value",
            init: {
              type: "init",
              provenance,
            } satisfies InstInitPlain,
            value,
          }) satisfies InstValPlain<T>
      )
    ),
    r.of({
      type: "close",
      init: { type: "init", provenance } satisfies InstInitPlain,
    } satisfies InstClose)
  );
};

export class InstantSubject<T> extends Subject<InstEmit<T>> {
  protected _provenance: symbol;

  constructor() {
    // NOTE: This must be here to obscure Observable's constructor.
    super();
    this._provenance = Symbol();
  }

  /** @internal */
  protected _subscribe(subscriber: r.Subscriber<InstEmit<T>>): r.Subscription {
    const subscription = super["_subscribe" as string as "subscribe"](subscriber);
    !subscription.closed &&
      subscriber.next({
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain);
    return subscription;
  }

  instNext(value: T): void {
    super.next({
      type: "value",
      init: {
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain,
      value,
    } satisfies InstValPlain<T>);
  }

  instClose(): void {
    super.next({
      type: "close",
      init: {
        type: "init",
        provenance: this._provenance,
      } satisfies InstInitPlain,
    } satisfies InstClose);
    super.complete();
  }

  next(val: InstEmit<T>): void {
    throw new Error("ERROR: `next` not implemented, use `instNext`");
  }

  close(): void {
    throw new Error("ERROR: `close` not implemented, use `instClose`");
  }
}

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
  if ("instNext" in inst) {
    return inst;
  }
  const subj = new InstantSubject<A>();
  let isSubscribed = false;
  return r.defer(() => {
    if (!isSubscribed) {
      inst.subscribe(subj);
      isSubscribed = true;
    }
    return subj;
  });
};

export const accumulate = <A>(initial: A): ((val: Instantaneous<(a: A) => A>) => Instantaneous<A>) => {
  let value = initial;
  return map((fn) => {
    const newValue = fn(value);
    value = newValue;
    return newValue;
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

// JOINS
// mergeAll, switchAll, concatAll, exhaustAll
// (each are called a `join` in haskell parlance)

const wrapChildEmit = <A>(childEmit: InstEmit<A>, parentInit: InstInit): InstEmit<A> => {
  if (isInit(childEmit)) {
    return {
      type: "init-child",
      parent: parentInit as InstInit,
      own: childEmit,
    } satisfies InstInitChild;
  }
  if (isVal(childEmit)) {
    if (childEmit.type === "value-filtered") {
      return {
        type: "value-filtered",
        init: {
          type: "init-child",
          parent: parentInit as InstInit,
          own: childEmit.init,
        } satisfies InstInitChild,
      } satisfies InstValFiltered;
    }
    return {
      type: "value",
      init: {
        type: "init-child",
        parent: parentInit as InstInit,
        own: childEmit.init,
      } satisfies InstInitChild,
      value: childEmit.value,
    } satisfies InstValPlain<A>;
  }
  return childEmit;
};

export const mergeAll =
  <A>(concurrent?: number) =>
  (insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
    const retval = insts.pipe(
      batchSync(),
      r.map((nested) => {
        const handleVal = (input: InstEmit<Instantaneous<A>>): Instantaneous<A> => {
          let parentInit: InstInit | undefined;
          if (isInit(input)) {
            parentInit = input;
            return r.of(input);
          }
          if (isVal(input)) {
            if (input.type === "value-filtered") return r.of(input);
            return r.merge(
              r.of({ type: "value-filtered", init: input.init as InstInit } satisfies InstValFiltered),
              input.value.pipe(r.map((emit2): InstEmit<A> => wrapChildEmit(emit2, parentInit as InstInit)))
            );
          }
          return r.of(input);
        };

        if (nested.type === "sync") {
          const inits = nested.value.filter(isInit);
          const nonInits = nested.value.filter((x) => !isInit(x));
          return r.merge(
            r.of({ type: "init-merge", children: inits } satisfies InstInitMerge),
            ...nonInits.map(handleVal)
          );
        }
        return handleVal(nested.value);
      }),
      r.mergeAll(concurrent)
    );
    return retval;
  };

// TODO:
// add batchSync() to this
// so that `switchMap(of)(a) === a`
export const switchAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  let previousInit: InstInit | undefined;
  return insts.pipe(
    r.map((emit): Instantaneous<A> => {
      const closePrev =
        previousInit !== undefined ? r.of({ type: "close", init: previousInit } satisfies InstClose) : r.EMPTY;
      if (isInit(emit)) {
        previousInit = emit;
        return r.merge(closePrev, r.of(emit));
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") return r.of(emit);
        if (emit.type === "value") {
          return r.merge(
            r.of({ type: "value-filtered", init: previousInit as InstInit } satisfies InstValFiltered),
            emit.value.pipe(r.map((emit2): InstEmit<A> => wrapChildEmit(emit2, previousInit as InstInit)))
          );
        }
      }

      // if we close before the next parent comes in
      previousInit = undefined;
      return r.of(emit);
    }),
    r.switchAll()
  );
};

export const concatAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  const sharedInput = share(insts);

  const filteredOutputs: Instantaneous<A> = sharedInput.pipe(
    r.switchMap((emit) => {
      if (isInit(emit)) {
        return r.of(emit);
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") {
          return r.of(emit);
        }
        return r.of({ type: "value-filtered", init: emit.init } satisfies InstValFiltered);
      }
      return r.EMPTY;
    })
  );

  let currentInit: InstInit | undefined;
  const concatOutputs: Instantaneous<A> = sharedInput.pipe(
    r.map((emit): Instantaneous<A> => {
      if (isInit(emit)) {
        currentInit = emit;
        return r.EMPTY;
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") return r.EMPTY;
        if (emit.type === "value") {
          return emit.value.pipe(r.map((emit2): InstEmit<A> => wrapChildEmit(emit2, currentInit as InstInit)));
        }
      }

      // if we close before the next parent comes in
      currentInit = undefined;
      return r.of(emit);
    }),
    r.concatAll()
  );

  return r.merge(filteredOutputs, concatOutputs);
};

export const exhaustAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  const sharedInput = share(insts);

  const filteredOutputs: Instantaneous<A> = sharedInput.pipe(
    r.switchMap((emit) => {
      if (isInit(emit)) {
        return r.of(emit);
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") {
          return r.of(emit);
        }
        return r.of({ type: "value-filtered", init: emit.init } satisfies InstValFiltered);
      }
      return r.EMPTY;
    })
  );

  let currentInit: InstInit | undefined;
  const concatOutputs: Instantaneous<A> = sharedInput.pipe(
    r.map((emit): Instantaneous<A> => {
      if (isInit(emit)) {
        currentInit = emit;
        return r.EMPTY;
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") return r.EMPTY;
        if (emit.type === "value") {
          return emit.value.pipe(r.map((emit2): InstEmit<A> => wrapChildEmit(emit2, currentInit as InstInit)));
        }
      }

      // if we close before the next parent comes in
      currentInit = undefined;
      return r.of(emit);
    }),
    r.concatAll()
  );

  return r.merge(filteredOutputs, concatOutputs);
};

export const batchSimultaneous = <A>(inst: Instantaneous<A>): Instantaneous<A[]> => {
  const memory = new ArrayKeyedMap<symbol[], number>();
  return null;
};
