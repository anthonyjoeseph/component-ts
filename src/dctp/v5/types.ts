import * as r from "rxjs";
import Observable = r.Observable;
import zip from "lodash/zip";

export type InstInitPlain = {
  type: "init";
  provenance: symbol;
  take?: number;
};

export type InstInitMerge<A> = {
  type: "init-merge";
  numSyncChildren: number;
  take?: number;
  syncParents: InstInit<A>[];
};

export type InstInitChild<A> = {
  type: "init-child";
  parent: InstInit<A>;
  init: InstInit<A>;
  syncVals: A[];
};

export type InstValPlain<A> = {
  type: "value";
  value: A;
  init: InstInit<A>;
};

export type InstClose<A> = {
  type: "close";
  init: InstInit<A>;
};

export type InstInit<A> = InstInitPlain | InstInitMerge<A> | InstInitChild<A>;

export type InstVal<A> = InstValPlain<A> | InstInitChild<A>;

export type InstEmit<A> = InstInit<A> | InstVal<A> | InstClose<A>;

export type Instantaneous<A> = Observable<InstEmit<A>>;

export const isInit = <A>(a: InstEmit<A>): a is InstInit<A> => {
  return a.type === "init" || a.type === "init-merge" || a.type === "init-child";
};

export const isVal = <A>(a: InstEmit<A>): a is InstVal<A> => {
  return a.type === "value" || a.type === "init-child";
};

// TODO: remove mutual recursion, make this stack-safe somehow
// see: actOnInit in batch-simultaneous.ts
export const mapInit = <A, B>(a: InstInit<A>, fn: (i: A[]) => B[]): InstInit<B> => {
  switch (a.type) {
    case "init":
      return a;
    case "init-merge":
      return {
        type: "init-merge",
        take: a.take,
        numSyncChildren: a.numSyncChildren,
        syncParents: a.syncParents.map((parent) => mapInit(parent, fn)),
      };
    case "init-child":
      return {
        type: "init-child",
        parent: mapInit(a.parent, fn),
        init: mapInit(a.init, fn),
        syncVals: fn(a.syncVals),
      };
  }
};

// TODO: remove mutual recursion, make this stack-safe somehow
export const mapVal = <A, B>(a: InstVal<A>, fn: (i: A) => B): InstVal<B> => {
  switch (a.type) {
    case "value":
      return {
        type: "value",
        init: mapInit(a.init, (as) => as.map(fn)),
        value: fn(a.value),
      };
    case "init-child":
      return {
        type: "init-child",
        init: mapInit(a.init, (as) => as.map(fn)),
        parent: mapInit(a.parent, (as) => as.map(fn)),
        syncVals: a.syncVals.map(fn),
      } satisfies InstInitChild<B>;
  }
};

export const initEq = <A>(a: InstInit<A>, b: InstInit<A>): boolean => {
  switch (a.type) {
    case "init":
      if (b.type !== "init") return false;
      return a.provenance === b.provenance;
    case "init-merge":
      if (b.type !== "init-merge") return false;
      const zipped = zip(a.syncParents, b.syncParents);
      return zipped.every(([parentA, parentB]) => {
        if (parentA === undefined || parentB === undefined) {
          return false;
        }
        return initEq(a, b);
      });
    case "init-child":
      if (b.type !== "init-child") return false;
      return initEq(a.init, b.init) && initEq(a.parent, b.parent);
  }
};
