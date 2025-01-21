import type { Observable } from "rxjs";
import * as r from 'rxjs';
import type { IO } from 'fp-ts/IO';
import type { Task }from 'fp-ts/Task';

export type Time = number;
export type Interval<A> = { low: A; high: A; };

export type Behavior<A> = { time: (t: Time) => A, interval: (i: Interval<Time>) => Interval<A> };

export type Event<A> = Iterable<Future<A>>;

export type Future<A> = r.Timestamp<A>



export const eventToObservable = <A, B>(fn: (e: Event<A>) => Event<Behavior<B>>): (o: Observable<Future<A>>) => Observable<Behavior<B>> => (o) => o.pipe(
  r.scan((val) => {
    const app = fn([val]);
    let nextBehavior: Behavior<B>;
    let isDone = false;
    do {
      const {value, done} = app[Symbol.iterator]().next();
      isDone = done;
    } while(!isDone);
    return undefined;
  }),
  r.switchMap(() => undefined),
);








// samples the program along its timer
export const entryPoint = <A>(program: Observable<Behavior<void>>, sampleTimer: Observable<number>): void => {
  throw new Error('unimplemented')
};

export const liftIO = <A>(obs: Observable<Behavior<IO<A>>>): Observable<Behavior<A>> => undefined;

export const liftTask = <A>(obs: Observable<Behavior<Task<A>>>): Observable<Behavior<A>> => undefined;

// need to provide a monad instance?
export const liftObs = <A>(obs: Observable<Behavior<Observable<A>>>): Observable<Behavior<A>> => undefined;

type DomAction = { type: "init" } | { type: "modify" };

const mapBehavior = <A, B>(fn: (a: A) => B) => (b: Behavior<A>): Behavior<B> => (time) => fn(b(time));

declare const element: (arg: {
  text?: Event<string>;
  x?: Behavior<number>;
  y?: Behavior<number>;
}) => [{ onClick: Observable<void> }, Event<DomAction>];


const [{onClick}, el] = element({});

const xyz = withBehavior(onClick).pipe(
  r.map(mapBehavior(fromFuture)),
);

element({ text:  });