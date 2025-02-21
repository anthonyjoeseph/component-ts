import * as r from "rxjs";

type FlatValue<A> = { type: "value"; value: A };
type FlatIterable<A> = { type: "iterable"; iterable: NestedIterable<A> };
type NestedIterable<A> = Iterable<FlatValue<A> | FlatIterable<A>>;

const flattenNested = <A>(iterable: NestedIterable<A>): Iterable<A> => {
  return (function* <A>() {
    let currentIterable = iterable;
    let next = currentIterable[Symbol.iterator]().next();

    while (!next.done) {
      if (next.value.type === "value") {
        yield next.value.value;
      } else {
        currentIterable = next.value.iterable;
      }
      next = currentIterable[Symbol.iterator]().next();
    }
  })();
};

function* natsSafe(start: number): NestedIterable<number> {
  yield { type: "value", value: start };
  yield { type: "iterable", iterable: natsSafe(start + 1) };
}

const infinite = r.from(flattenNested(natsSafe(0)));

const finite = infinite.pipe(r.take(100000), r.toArray());

// finite.subscribe(console.log);
