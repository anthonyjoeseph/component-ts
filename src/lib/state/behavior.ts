import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { pipe } from "fp-ts/function";
import * as A from "fp-ts/Array";

import BS = r.BehaviorSubject;
import { ArrayAction, arrayDiff, modifyArray } from "./array";

export const distinctUntilChanged = ro.distinctUntilChanged;

export const struct = <A>(subjs: {
  [K in keyof A]: BS<A[K]>;
}): BS<A> => {
  const defaultVal = Object.fromEntries(
    Object.entries(subjs as Record<string, BS<unknown>>).map(([key, subj]) => [key, subj.getValue()] as const)
  ) as A;
  const newBS = new BS<A>(defaultVal);

  return;
};

export const keysFromDefault = <A extends Record<string, unknown>>(defaultValue: A) =>
  Object.fromEntries(Object.entries(defaultValue).map(([key, value]) => [key, new BS(value)])) as {
    [K in keyof A]: BS<A[K]>;
  };

export type Behavior<A> = {
  default: A;
  latest: r.Observable<A>;
};
export const behavior = <A>(behavior: BS<A>): Behavior<A> => ({
  default: behavior.getValue(),
  latest: behavior.pipe(ro.skip(1)),
});

/**
 * Notes:
 * should be (b: BS<A[]> o: Observable<ArrayAction<A>>) => Observable<ArrayAction<A> | ArrayWarning<A>>
 *
 * _Should not return a subject_
 */
export const array = <A>(arrays: BS<A[]>, uniqueKey: (a: A) => string): r.Subject<ArrayAction<A>> => {
  const actions = new r.Subject<ArrayAction<A>>();
  const middleman = new r.Subject<{ type: "action"; action: ArrayAction<A> } | { type: "array"; array: A[] }>();
  arrays.pipe(ro.bufferCount(2)).subscribe(([prev, current]) => {
    arrayDiff(prev, current, uniqueKey).forEach((action) => middleman.next({ type: "action", action }));
  });
  actions.subscribe((action) => {
    const newArray = modifyArray(arrays.getValue(), action);
    if (newArray._tag === "Some") middleman.next({ type: "array", array: newArray.value });
  });
  return actions;
};
