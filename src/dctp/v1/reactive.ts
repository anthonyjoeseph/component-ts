import type { Observable } from "rxjs";
import * as r from "rxjs";
export interface NonEmptyArray<A> extends Array<A> {
  0: A;
}

export type None = { _tag: "None" };
export type Some<A> = { _tag: "Some"; value: A };
export type Option<A> = Some<A> | None;

export const none: Option<never> = { _tag: "None" };
export const some = <A>(value: A): Option<A> => ({ _tag: "Some", value });
export const compact = <A>(arr: Option<A>[]): A[] =>
  arr.filter((a): a is Some<A> => a._tag === "Some").map((a) => a.value);

export type Reactive<A> = {
  provenance: Symbol;
  latest: A;
  signal: Observable<null>;
};

export const reactive = <A>(initial: A, obs: Observable<A>): Reactive<A> => {
  const reactive: Reactive<A> = {
    provenance: Symbol(),
    latest: initial,
    signal: obs.pipe(
      r.map((newValue) => {
        reactive.latest = newValue;
        return null;
      })
    ),
  };
  return reactive;
};
