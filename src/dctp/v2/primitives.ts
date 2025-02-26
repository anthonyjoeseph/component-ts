import * as r from "rxjs";

r.mergeAll;

type O<A> = r.Observable<A>;

declare const pure: <A>(a: A) => O<A>;

declare const map: <A, B>(a: O<A>, fn: (a: A) => B) => O<B>;

declare const defer: <A>(fn: () => O<A>) => O<A>;

declare const merge2: <A>(a: O<A>, b: O<A>) => O<A>;

declare const pairwise: <A>(initial: A, a: O<A>) => O<[A, A]>;

const mergeAll3 = <A>(a: O<O<A>>): O<A> => {
  return new r.Observable(({ next }) => {
    a.subscribe((b) => {
      b.subscribe((c) => {
        next(c);
      });
    });
  });
};

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

// TODO: add a "concurent" parameter
// maybe need 'concat2' and 'pairwise'?
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
