import { accumulate, Instantaneous, of, map, merge, switchMap, share, empty } from "./inst-v3";
import { pipeWith } from "pipe-ts";

// TODO
// `observeOn` fn that approximates a scheduler using `buffer`

export const scan =
  <A, B>(initial: B, fn: (acc: B, cur: A) => B) =>
  (ob: Instantaneous<A>): Instantaneous<B> => {
    return pipeWith(
      ob,
      map((a): ((b: B) => B) => {
        return (b: B): B => fn(b, a);
      }),
      accumulate(initial)
    );
  };

export const pairwise =
  <A>(initial: A) =>
  (a: Instantaneous<A>): Instantaneous<[A, A]> => {
    return pipeWith(
      a,
      map((newOne): ((a: [A, A]) => [A, A]) => {
        return ([, old]) => [old, newOne];
      }),
      accumulate([initial, initial])
    );
  };

export const mergeMap =
  <A, B>(fn: (a: A) => Instantaneous<B>) =>
  (ob: Instantaneous<A>): Instantaneous<B> => {
    return pipeWith(
      ob,
      scan(empty as Instantaneous<B>, (acc, cur) => merge([acc, share(fn(cur))])),
      switchMap((a) => a)
    );
  };

export const filter =
  <A, B extends A>(pred: (a: A) => a is B) =>
  (ob: Instantaneous<A>): Instantaneous<B> => {
    return pipeWith(
      ob,
      switchMap((a) => (pred(a) ? of(a) : empty))
    );
  };

export const batch =
  <A>(count: number) =>
  (ob: Instantaneous<A>): Instantaneous<A[]> => {
    return pipeWith(
      ob,
      scan([] as A[], (acc, cur) => (acc.length === count ? [cur] : [...acc, cur])),
      filter((arr): arr is A[] => arr.length === count)
    );
  };

export const buffer =
  <A>(until: Instantaneous<unknown>) =>
  (ob: Instantaneous<A>): Instantaneous<A[]> => {
    return pipeWith(
      merge<{ type: "emit"; value: A } | { type: "close" }>([
        pipeWith(
          ob,
          map((value) => ({ type: "emit" as const, value }))
        ),
        pipeWith(
          until,
          map(() => ({ type: "close" as const }))
        ),
      ]),
      scan({ type: "closed" } as { type: "closed" } | { type: "open"; batch: A[] }, (acc, cur) =>
        cur.type === "close"
          ? { type: "closed" as const }
          : {
              type: "open" as const,
              batch: acc.type === "open" ? [...acc.batch, cur.value] : [cur.value],
            }
      ),
      filter((e): e is { type: "open"; batch: A[] } => e.type === "open"),
      map(({ batch }) => batch)
    );
  };
