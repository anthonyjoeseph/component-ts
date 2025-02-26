export type Lazy<A> = () => A;

const a: Lazy<number> = () => 3;

export type LazyEmpty = () => { type: "Empty" };
export type LazyNext<A> = () => { type: "Next"; value: Lazy<A>; next: LazyList<A> };

export type LazyList<A> = LazyEmpty | LazyNext<A>;

export const ones: LazyList<number> = () => ({ type: "Next", value: () => 1, next: ones });
export const buildNats =
  (start: Lazy<number>): LazyList<number> =>
  () => {
    const val = start();
    return { type: "Next", value: () => val, next: buildNats(() => val + 1) };
  };
export const nats = buildNats(() => 0);

export const lazyTake = <A>(list: LazyList<A>, num: Lazy<number>): LazyList<A> => {
  const strictNum = num();
  if (strictNum === 0) {
    return () => ({ type: "Empty" });
  }
  const strictEval = list();
  if (strictEval.type === "Empty") {
    return () => ({ type: "Empty" });
  }
  const { value, next } = strictEval;

  return () => ({ type: "Next", next: lazyTake(next, () => strictNum - 1), value });
};

export const lazyEvaluate = <A>(list: LazyList<A>): A[] => {
  const accum: A[] = [];
  let open = true;
  let iterate = list();

  while (iterate.type !== "Empty") {
    accum.push(iterate.value());
    iterate = iterate.next();
  }

  return accum;
};

// const test = lazyEvaluate(lazyTake(nats, () => 50000));

// console.log(test);
