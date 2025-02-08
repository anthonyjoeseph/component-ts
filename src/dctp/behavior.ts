import type { Observable } from "rxjs";
import * as r from "rxjs";
import { Interval, Time } from "./calculus";
import { Event } from "./event";
import { Reactive, type Option } from "./reactive";

export type Behavior<A> = {
  reactives: Reactive<Option<r.Timestamp<unknown>>>[];
  latestTrim: Time;
  pull: (time: Time) => A;
  pullInterval: (interval: Interval<Time>) => Interval<A>;
  trim: (time: Time) => void;
};

export const behavior = () => {};

export const sample = <A>(behavior: Behavior<A>, sampler: Observable<Time>): Observable<A> =>
  r.merge(r.merge(...behavior.reactives.map((re) => re.signal)).pipe(r.mergeMap(() => r.EMPTY)), sampler).pipe(
    r.map((time) => {
      const emissions = behavior.pull(time);
      behavior.trim(time);
      return emissions;
    })
  );

export const step = <A>(a: Event<A>): Behavior<A> => undefined as unknown as Behavior<A>;

export const snapshot = <A, B>(a: Event<A>, b: Behavior<B>): Event<[A, B]> => undefined as unknown as Event<[A, B]>;

const split = (interval: Interval<number>): [Interval<number>, Interval<number>] => [
  { low: interval.low, high: interval.high - (interval.high - interval.low) / 2 },
  { low: interval.low + (interval.high - interval.low) / 2, high: interval.high },
];

// the start time when boolean behavior becomes true
export const predicate = (b: Behavior<boolean>, errorMargin: Time = 1): Event<void> => {
  return {
    reactives: b.reactives,
    trim: (time) => b.trim(time),
    pull: (time) => {
      let lowestError = Infinity;
      const intervalsToTry: Interval<Time>[] = [{ low: b.latestTrim, high: time }];
      const emissions: r.Timestamp<void>[] = [];
      while (intervalsToTry.length > 0) {
        const tryNextCycle: Interval<Time>[] = [];
        for (const interval of intervalsToTry) {
          const value = b.pullInterval(interval);
          if (value.high === true) {
            if (interval.high - interval.low > lowestError) {
              tryNextCycle.push(...split(interval));
            } else {
              emissions.push({ timestamp: interval.low, value: null as unknown as void });
            }
          }
        }
        intervalsToTry.push(...tryNextCycle);
      }
      return emissions;
    },
  };
};

export const integral = <A>(b: Behavior<A>): Behavior<A> => undefined as unknown as Behavior<A>;
