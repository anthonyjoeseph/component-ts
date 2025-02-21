export type Time = number;
export type Polynomial = {
  coefficient: number;
}[];
export type Approximate<A> = {
  at: (time: Time) => A;
  between: (interval: Interval<Time>) => Interval<A>;
};
export type Interval<A> = {
  low: A;
  high: A;
};

export const applyPolynomial = (x: number, polynomial: Polynomial): number =>
  polynomial.reduce((acc, cur, index) => acc + cur.coefficient * x ** index, 0);

export const at =
  <A = number>(time: Time) =>
  (fn: Approximate<A> | Polynomial): A => {
    if (Array.isArray(fn)) {
      return applyPolynomial(time, fn) as A;
    }
    return fn.at(time);
  };

export const between =
  <A = number>(interval: Interval<Time>) =>
  (fn: Approximate<A> | Polynomial): Interval<A> => {
    if (Array.isArray(fn)) {
      return {
        low: applyPolynomial(interval.low, fn) as A,
        high: applyPolynomial(interval.high, fn) as A,
      };
    }
    return fn.between(interval);
  };
