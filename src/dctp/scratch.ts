import * as r from "rxjs";
import * as e from "./event";

type O<A> = r.Observable<A>;

const f = r;
const g = e;

const ancestor1 = r.timer(0, 1000);
const ancestor2 = r.timer(500, 1000);
const one = e.fromObservable(ancestor1);
const two = e.fromObservable(ancestor2);
const both = e.of(one, two);
const merged = e.mergeAll(both);

//e.toObservable(merged).subscribe(console.log);

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

const sharedTimer = r.timer(0, 1000).pipe(r.share());

const higherOrder = sharedTimer.pipe(
  r.map((startVal) => {
    return r.timer(0, 1000).pipe(r.map(() => startVal));
  })
);

const a = destructure(higherOrder);

const it = a[Symbol.iterator]();

const first: O<number> = it.next().value;
const second: O<number> = it.next().value;
const third: O<number> = it.next().value;
const fourth: O<number> = it.next().value;
const fifth: O<number> = it.next().value;
