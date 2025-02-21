import * as r from "rxjs";

type O<A> = r.Observable<A>;

declare const pure: <A>(a: A) => O<A>;

declare const map: <A, B>(a: O<A>, fn: (a: A) => B) => O<B>;

declare const defer: <A>(fn: () => O<A>) => O<A>;

declare const merge2: <A>(a: O<A>, b: O<A>) => O<A>;

declare const pairwise: <A>(initial: A, a: O<A>) => O<[A, A]>;

/**
 * 'list' flaten in haskell
 *
 * flatten :: [[a]] -> [a]
 * flatten [[]] = []
 * flatten [[a]] = [a] -- do we need this line?
 * flatten (x: xs) = x++ flatten xs
 */

// b "overrides" a when it starts
// an implementation will handle "cleaning up"
declare const switch2: <A>(a: O<A>, b: O<A>) => O<A>;

const destructure = <A>(a: O<O<A>>): Iterable<O<A>> => {
  const ret = function* (): Generator<O<A>> {
    for (let i = 0; true; i++) {
      const currentIndex = i;
      yield a.pipe(
        r.map((v, index) => [v, index] as const),
        r.filter(([, index]) => index === currentIndex),
        r.mergeMap(([v]) => v)
      );
    }
  };
  return ret();
};

const next = <A>(a: Iterator<A>): [A, Iterator<A>] => [a.next().value, a];

const switchAll = <A>(a: O<O<A>>): O<A> => {
  const rec = (it: Iterator<O<A>>): O<A> => {
    const [head, tail] = next(it);
    if (a === r.EMPTY) return r.EMPTY;

    return switch2(
      head,
      defer(() => rec(tail))
    );
  };

  const it = destructure(a);
  return rec(it[Symbol.iterator]());
};

const mergeAll = <A>(a: O<O<A>>): O<A> => {
  const rec = (it: Iterator<O<A>>): O<A> => {
    const [head, tail] = next(it);
    if (a === r.EMPTY) return r.EMPTY;

    return merge2(
      head,
      defer(() => rec(tail))
    );
  };

  const it = destructure(a);
  return rec(it[Symbol.iterator]());
};

//
//
//
//
//
//
//
//
//
//
//
//
//
//

// subscribes to cold observables redundantly...does that matter?
export const mergeAll2 = <A>(a: O<O<A>>): O<A> => {
  return switchAll(map(pairwise(r.EMPTY, a), ([init, last]) => merge2(init, last)));
};

// we can get this from "pairwise"
declare const withIndex: <A>(a: O<A>) => O<[A, number]>;

const brokenSwitchAll = <A>(a: O<O<A>>): O<A> => {
  if (a === r.EMPTY) {
    // is there some notion of a higher-order Observable containing
    // only empty values that we can consider equal to each other?

    // a.mergeMap(() => r.EMPTY) === b.mergeMap(() => r.EMPTY)
    // for all Observables?

    // that would be a useful base-case here
    return a as O<never>;
  }
  const head: O<A> = brokenSwitchAll(
    map(withIndex(a), ([nextObs, index]) => {
      if (index === 0) return nextObs;
      else return r.EMPTY;
    })
  );

  const tail: O<A> = brokenSwitchAll(
    map(withIndex(a), ([nextObs, index]) => {
      if (index === 0) return r.EMPTY;
      else return nextObs;
    })
  );

  return merge2(head, tail);
};
