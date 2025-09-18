import * as r from "rxjs";
import Observable = r.Observable;
import zip from "lodash/zip";

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

export type InstValSync<A> = {
  type: "value-sync";
  values: A[];
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

export type InstVal<A> = InstValPlain<A> | InstValSync<A> | InstValFiltered;

export type InstEmit<A> = InstInit | InstVal<A> | InstClose;

export type Instantaneous<A> = Observable<InstEmit<A>>;

export const isInit = <A>(a: InstEmit<A>): a is InstInit => {
  return a.type === "init" || a.type === "init-merge" || a.type === "init-child";
};

export const isVal = <A>(a: InstEmit<A>): a is InstVal<A> => {
  return a.type === "value" || a.type === "value-filtered" || a.type === "value-sync";
};

export const mapVal = <A, B>(a: InstVal<A>, fn: (i: InstValPlain<A>) => InstValPlain<B>): InstVal<B> => {
  switch (a.type) {
    case "value":
      return fn(a);
    case "value-sync":
      return {
        ...a,
        values: a.values
          .map((value) => ({ type: "value", init: a.init, value }) satisfies InstValPlain<A>)
          .map(fn)
          .map((plain) => plain.value),
      };
    case "value-filtered":
      return a;
  }
};

export const initEq = <A>(a: InstInit, b: InstInit): boolean => {
  switch (a.type) {
    case "init":
      if (b.type !== "init") return false;
      return a.provenance === b.provenance;
    case "init-merge":
      if (b.type !== "init-merge") return false;
      const zipped = zip(a.children, b.children);
      return zipped.every(([childA, childB]) => {
        if (childA === undefined || childB === undefined) {
          return false;
        }
        return initEq(a, b);
      });
    case "init-child":
      if (b.type !== "init-child") return false;
      return initEq(a.own, b.own) && initEq(a.parent, b.parent);
  }
};
