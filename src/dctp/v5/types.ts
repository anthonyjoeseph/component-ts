import * as r from "rxjs";
import Observable = r.Observable;

export type InstInit<A> = {
  type: "init";
  provenance: symbol;
  children: (InstEmit<A> | InstVal<A> | InstClose)[];
};
export type InstAsync<A> = {
  type: "async";
  provenance: symbol;
  child: InstEmit<A> | InstVal<A> | InstClose | null;
};
export type InstVal<A> = {
  type: "value";
  value: A;
};
export type InstClose = {
  type: "close";
};

export type InstEmit<A> = InstInit<A> | InstAsync<A>;
export type Instantaneous<A> = Observable<InstEmit<A>>;

export const init = <A>(input: {
  provenance: symbol;
  children: (InstEmit<A> | InstVal<A> | InstClose)[];
}): InstInit<A> => ({
  type: "init",
  ...input,
});
export const async = <A>(input: {
  provenance: symbol;
  child: InstInit<A> | InstAsync<A> | InstVal<A> | InstClose | null;
}): InstAsync<A> => ({
  type: "async",
  ...input,
});
export const val = <A>(value: A): InstVal<A> => ({ type: "value", value });
export const close: InstClose = { type: "close" };

export const isInit = <A>(a: InstEmit<A>): a is InstInit<A> => {
  return a.type === "init";
};

export const isAsync = <A>(a: InstEmit<A>): a is InstAsync<A> => {
  return a.type === "async";
};

export const map = <A, B>(
  a: InstInit<A> | InstAsync<A> | InstVal<A> | InstClose,
  fn: (a: A) => B
): InstInit<B> | InstAsync<B> | InstVal<B> | InstClose => {
  switch (a.type) {
    case "init":
      return {
        type: "init",
        provenance: a.provenance,
        children: a.children.map((child) => map(child, fn) as InstClose | InstEmit<B>),
      } satisfies InstInit<B>;
    case "async":
      return {
        type: "async",
        provenance: a.provenance,
        child: a == null ? null : map(a, fn),
      } satisfies InstAsync<B>;
    case "value":
      return {
        type: "value",
        value: fn(a.value),
      } satisfies InstVal<B>;
    case "close":
      return a;
  }
};

export const values = <A>(emit: InstEmit<A>): A[] => {
  if (emit.type === "init") {
    return emit.children.flatMap((child) => (child.type === "value" ? [child.value] : []));
  }
  return emit.child == null
    ? []
    : emit.child.type === "value"
      ? [emit.child.value]
      : emit.child.type === "close"
        ? []
        : values(emit.child);
};
