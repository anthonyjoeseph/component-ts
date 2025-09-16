import * as r from "rxjs";
import { batchSync } from "./batch-sync";
import ArrayKeyedMap from "array-keyed-map";

export type InstInitPlain = {
  type: "init";
  provenance: symbol;
};

export type InstInitMerge = {
  type: "init-merge";
  children: InstInit[];
};

export type InstInitSwitchMapParent = {
  type: "init-switchMap-parent";
  elem: InstInit;
};

export type InstInitSwitchMapChild = {
  type: "init-switchMap-child";
  parent: InstInit;
  elem: InstInit;
  removePrevious?: InstInit;
};

export type InstValPlain<A> = {
  type: "value";
  value: A;
  filtered: boolean;
  provenance: symbol;
};

export type InstValMerge<A> = {
  type: "value-merge";
  siblings: InstInit[];
  elem: InstVal<A>;
};

export type InstValSwitchMap<A> = {
  type: "value-switchMap";
  parent: InstInit;
  elem: InstVal<A>;
};

export type InstInit = InstInitPlain | InstInitMerge | InstInitSwitchMapParent | InstInitSwitchMapChild;

export type InstVal<A> = InstValPlain<A> | InstValMerge<A> | InstValSwitchMap<A>;

export type InstEmit<A> = InstInit | InstVal<A>;

export type Instantaneous<A> = r.Observable<InstEmit<A>>;

const isInit = (a: InstEmit<unknown>): a is InstInit => {
  return (
    a.type === "init" ||
    a.type === "init-merge" ||
    a.type === "init-switchMap-child" ||
    a.type === "init-switchMap-parent"
  );
};

const makeFiltered = <A>(a: InstVal<A>): InstVal<never> => {
  switch (a.type) {
    case "value":
      return {
        ...a,
        value: undefined,
        filtered: true,
      } as InstVal<never>;
    case "value-merge":
      return {
        type: "value-merge",
        siblings: a.siblings,
        elem: makeFiltered(a.elem),
      };
    case "value-switchMap":
      return {
        type: "value-switchMap",
        parent: a.parent,
        elem: makeFiltered(a.elem),
      };
  }
};

const changeVal = <A, B>(a: InstVal<A>, fn: (a: A) => B): InstVal<B> => {
  switch (a.type) {
    case "value":
      return {
        ...a,
        value: undefined,
        filtered: true,
      } as InstVal<never>;
    case "value-merge":
      return {
        type: "value-merge",
        siblings: a.siblings,
        elem: changeVal(a.elem, fn),
      };
    case "value-switchMap":
      return {
        type: "value-switchMap",
        parent: a.parent,
        elem: changeVal(a.elem, fn),
      };
  }
};

const getValue = <A>(a: InstVal<A>): A => {
  switch (a.type) {
    case "value":
      return a.value;
    case "value-merge":
      return getValue(a.elem);
    case "value-switchMap":
      return getValue(a.elem);
  }
};

export const merge = <A>(elements: Instantaneous<A>[]): Instantaneous<A> => {
  let siblings: InstInit[];
  return r.merge(...elements).pipe(
    batchSync(),
    r.mergeMap((batchEmit) => {
      if (batchEmit.type === "sync") {
        const inits = batchEmit.value.filter(isInit);
        const nonInits = batchEmit.value.filter((a) => !isInit(a));
        siblings = inits;
        return r.of(
          {
            type: "init-merge",
            children: inits,
          } satisfies InstInitMerge,
          ...nonInits
        );
      } else {
        return r.of({
          type: "value-merge",
          siblings: siblings,
          elem: batchEmit.value as InstVal<A>,
        } satisfies InstValMerge<A>);
      }
    })
  );
};

export const switchMap =
  <A, B>(childFn: (emission: A) => Instantaneous<B>) =>
  (parentObs: Instantaneous<A>): Instantaneous<B> => {
    let parentInit: InstInit;
    let previousChild: InstInit | undefined;
    return parentObs.pipe(
      r.switchMap((emit) => {
        if (isInit(emit)) {
          parentInit = emit;
          return r.of({
            type: "init-switchMap-parent",
            elem: emit,
          } satisfies InstInitSwitchMapParent);
        } else {
          return r.merge(
            r.of(makeFiltered(emit)),
            childFn(getValue(emit)).pipe(
              r.map((childEmit): InstEmit<B> => {
                if (isInit(childEmit)) {
                  const beforeResetPreviousChild = previousChild;
                  previousChild = childEmit;
                  return {
                    type: "init-switchMap-child",
                    parent: parentInit,
                    elem: childEmit,
                    removePrevious: beforeResetPreviousChild,
                  } satisfies InstInitSwitchMapChild;
                } else {
                  return {
                    type: "value-switchMap",
                    parent: parentInit,
                    elem: childEmit,
                  } satisfies InstValSwitchMap<B>;
                }
              })
            )
          );
        }
      })
    );
  };

/**
 * Cases to consider:
 *
 *
 * shared parents
 * shared = switchMap(a, () => b)
 * merge(a, shared, shared)
 *
 * shared nested parents
 * nested = switchMap(a, switchMap(b, () => c));
 * merge(a, nested, nested)
 *
 * shared parents, unrelated emissions
 * merge(a, switchMap(a, () => b), switchMap(a, () => c))
 *
 * multiple relevant parents
 * shared = switchMap(merge(a, b), () => c)
 * merge(a, b, shared, shared)
 *
 * parents siblings includes self
 * merge(a, switchMap(b, () => a))
 *
 */

/**
 * idea:
 * an array-keyed map
 *
 * the key = ancestor provenances + provenance
 * the value = { count: number; potentialCount: number; batch: array }
 *
 * when we receive an InstInitSwitchMapChild,
 * - if it doesn't exist yet, set `potentialCount` to the # of siblings
 * of its nearest ancestor, and set `count` to 1
 * - and also, go thru and find all other cases with the same ancestor,
 * and if they have a potentialCount, increment their `count`
 *
 * - if it does exist, [not sure where this is going]
 *
 *
 *
 */

export const batchSimultaneous = <A>(obs: Instantaneous<A>): Instantaneous<A[]> => {
  return null;
};

export const instantaneous = <A>(obs: r.Observable<A>): Instantaneous<A> => {
  const provenance = Symbol();
  return obs.pipe(
    r.map(
      (value): InstVal<A> => ({
        type: "value",
        provenance: provenance,
        value,
        filtered: false,
      })
    ),
    r.startWith({ type: "init", provenance } satisfies InstInit)
  );
};

export const fromInstantaneous: <A>(obs: Instantaneous<A>) => r.Observable<A> = r.pipe(
  r.filter((emit) => emit.type === "value"),
  r.map((emit) => emit.value)
);

// TODO: Optimize this to ignore obs that are already hot
// b/c the current impl is very inefficient re: mergeMap
// i.e. there are 2 ways to create an instantaneous:
// with a subject `createHot()`, or with a callback fn `cold(...)`
// these have yet to be written - for now, it's just the `instantaneous` fn
// (which should eventually be deleted in favor of these other options)
export const share = <A>(inst: Instantaneous<A>): Instantaneous<A> => inst.pipe(r.share());

// this should be in the util package, written in terms of "cold(...)" - see above
export const of = <A>(...as: A[]): Instantaneous<A> => instantaneous(r.of(...as));

export const empty: Instantaneous<never> = r.EMPTY;

export const map = <A, B>(fn: (val: A) => B): ((val: Instantaneous<A>) => Instantaneous<B>) => {
  return (obs) => obs.pipe(r.map((emit): InstEmit<B> => (isInit(emit) ? emit : changeVal(emit, fn))));
};

export const accumulate = <A>(initial: A): ((val: Instantaneous<(a: A) => A>) => Instantaneous<A>) => {
  let value = initial;
  return map((fn) => {
    const newValue = fn(value);
    value = newValue;
    return newValue;
  });
};
