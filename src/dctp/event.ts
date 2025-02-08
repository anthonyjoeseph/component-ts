import type { Observable } from "rxjs";
import * as r from "rxjs";
import { Time } from "./calculus";
import { none, reactive, Reactive, some, type Option, type Some } from "./reactive";

export type Event<A> = {
  reactives: Reactive<Option<r.Timestamp<unknown>>>[];
  pull: (time: Time) => r.Timestamp<A>[];
  trim: () => void;
};

export const map =
  <A, B>(fn: (a: A) => B) =>
  (e: Event<A>): Event<B> => {
    return {
      reactives: e.reactives,
      pull: (time) => e.pull(time).map((em) => ({ ...em, value: fn(em.value) })),
      trim: e.trim,
    };
  };

export const filter =
  <A>(fn: (a: A) => boolean) =>
  (e: Event<A>): Event<A> => {
    return {
      reactives: e.reactives,
      pull: (time) => e.pull(time).filter((e) => fn(e.value)),
      trim: e.trim,
    };
  };

export const fromObservable = <A>(obs: Observable<r.Timestamp<A>>): Event<A> => {
  const re = reactive(none, obs.pipe(r.map(some)));
  const emissions: r.Timestamp<A>[] = [];
  return {
    reactives: [
      {
        ...re,
        signal: re.signal.pipe(
          r.tap(() => {
            emissions.push((re.latest as Some<r.Timestamp<A>>).value);
          })
        ),
      },
    ],
    pull: () => emissions,
    trim: () => {
      emissions.splice(0, emissions.length);
    },
  };
};

export const fromObservableApprox = <A>(obs: Observable<A>): Event<A> => {
  const re = reactive(none, obs.pipe(r.map(some)));
  const emissions: r.Timestamp<A>[] = [];
  return {
    reactives: [
      {
        ...re,
        signal: re.signal.pipe(
          r.tap(() => {
            emissions.push((re.latest as Some<r.Timestamp<A>>).value);
          })
        ),
      },
    ],
    pull: () => emissions,
    trim: () => {
      emissions.splice(0, emissions.length);
    },
  };
};

export const toObservable = <A>(event: Event<A>): Observable<A> =>
  r
    .merge(
      ...event.reactives.map((re) =>
        re.signal.pipe(r.map(() => (re.latest as Some<r.Timestamp<unknown>>).value.timestamp))
      )
    )
    .pipe(
      r.mergeMap((time) => {
        const emissions = event.pull(time).map((em) => em.value);
        event.trim();
        return r.of(...emissions);
      })
    );

export const timer = (delay: Time, interval: Time): Event<number> => {
  return {
    reactives: [],
    trim: () => {},
    pull: (time) => {},
  };
};

// re-implement "merge" to be this instead
export const concurrent = <A>(concurrency: number, event: Event<Event<A>>): Event<A> =>
  undefined as unknown as Event<A>;

export const switcher = <A>(event: Event<Event<A>>): Event<A> => undefined as unknown as Event<A>;

export const merge = <All extends unknown[]>(
  events: [
    ...{
      [K in keyof All]: Event<All[K]>;
    },
  ]
): Event<All[number][]> => {
  let latestReactiveIndicies: number[] = []; // initial value is none? all? leftmost?
  const allReactives = events.flatMap((e, eventIndex) =>
    e.reactives.map((re, reactiveIndex) => [re, reactiveIndex + eventIndex * e.reactives.length] as const)
  );
  let uniqueReactives: { reactive: Reactive<unknown>; eventIndicies: number[] }[] = [];
  for (let i = 0; i < allReactives.length; i++) {
    const [cur, eventIndex] = allReactives[i]!;

    const existingReactive = uniqueReactives.find(({ reactive }) => reactive.provenance === cur.provenance);
    if (existingReactive) {
      existingReactive.eventIndicies.push(eventIndex);
    } else {
      uniqueReactives.push({ reactive: cur, eventIndicies: [eventIndex] });
    }
  }

  return {
    reactives: uniqueReactives.map(({ reactive, eventIndicies }) => ({
      ...reactive,
      signal: reactive.signal.pipe(
        r.tap(() => {
          latestReactiveIndicies = eventIndicies;
        })
      ),
    })),
    pull: (time) => {
      return latestReactiveIndicies.map((eventIndex) => events[eventIndex].pull());
    },
    trim: () => {
      for (const e of events) {
        e.trim();
      }
    },
  };
};
