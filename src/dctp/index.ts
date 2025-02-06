import type { Observable } from "rxjs";

type Interval<A> = {
  low: A;
  high: A;
};

type Behavior<A> = Observable<A> & {
  getValue: () => A;
  getInterval: () => Interval<A>;
};
