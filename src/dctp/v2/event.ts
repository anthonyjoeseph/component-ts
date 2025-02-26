import * as i from "ix/iterable";
import * as r from "rxjs";
import { SymbolMapping, get, set } from "./util";

export type Gen<A> = (provenance: symbol) => Iterable<A>;

export interface Event<A> {
  generator: Gen<A>;
  provenance: r.BehaviorSubject<symbol[]>;
  reactive: r.Observable<symbol>;
}

export const fromObservable = <A>(obs: r.Observable<A>): Event<A> => {
  let latest: A;
  const selfProvenance = Symbol();
  const provenance = new r.BehaviorSubject([selfProvenance]);
  const ev: Event<A> = {
    generator: function* (givenP) {
      if (givenP === selfProvenance) {
        yield latest;
      }
      return;
    },
    provenance,
    reactive: obs.pipe(
      r.map((a) => {
        latest = a;
        return selfProvenance;
      })
      /* r.finalize(() => {
        const currentP = [...provenance.getValue()];
        const selfIndex = currentP.indexOf(selfProvenance);
        const withoutSelf = currentP.splice(selfIndex);
        provenance.next(withoutSelf);
      }) */
    ),
  };
  return ev;
};

export const toObservable = <A>(ev: Event<A>): r.Observable<A> => {
  const ob = ev.reactive.pipe(r.mergeMap((provenance) => r.from(ev.generator(provenance))));
  return ob;
};

export const map = <A, B>(ev: Event<A>, fn: (a: A) => B): Event<B> => {
  return undefined;
};

export const pairwise = <A>(ev: Event<A>): Event<[A, A]> => {};

export const merge2 = <A>(a: Event<A>, b: Event<A>): Event<A> => undefined;

export const switch2 = <A>(a: Event<A>, b: Event<A>): Event<A> => undefined;

export const of = <A>(...values: A[]): Event<A> => {
  const ev: Event<A> = {
    generator: () => i.from(values),
    provenance: new r.BehaviorSubject<symbol[]>([]),
    reactive: r.EMPTY,
  };
  return ev;
};

// TODO: add 'concurrency' argument, a la rxjs mergeAll
export const mergeAll = <A>(outer: Event<Event<A>>): Event<A> => {
  const reactiveSubj = new r.Subject<r.Observable<symbol>>();
  /* reactiveSubj.next(
    outer.reactive.pipe(
      r.finalize(() => {
        const allSymbols = outer.provenance.getValue();
        for (const symb of allSymbols) {
          remove(mapping, symb);
        }
      })
    )
  ); */
  const mutableProvenance = new r.BehaviorSubject<symbol[]>([]);

  const mapping: SymbolMapping<Gen<A>> = outer.provenance.getValue().map((provenance) => ({
    provenance,
    values: [
      function* (provenance) {
        const { value: inner }: { value: Event<A> } = outer.generator(provenance)[Symbol.iterator]().next();
        reactiveSubj.next(inner.reactive);

        const allNew: symbol[] = [];
        for (const newProvenance of inner.provenance.getValue()) {
          set(mapping, provenance, inner.generator);
          if (!mutableProvenance.getValue().includes(newProvenance)) {
            allNew.push(newProvenance);
          }
        }
        if (allNew.length > 0) {
          mutableProvenance.next([...mutableProvenance.getValue(), ...allNew]);
        }
      },
    ],
  }));
  const ev: Event<A> = {
    generator: function* (provenance) {
      const iteratorsForProv = get(mapping, provenance);
      if (iteratorsForProv._tag === "Some") {
        for (const it of iteratorsForProv.value) {
          yield* it(provenance);
        }
      }
      return;
    },
    provenance: mutableProvenance,
    reactive: r
      .merge(
        reactiveSubj,
        r.defer(() => {
          reactiveSubj.next(outer.reactive);
          return r.EMPTY;
        })
      )
      .pipe(
        r.map((a) => {
          return a;
        }),
        r.mergeAll(),
        r.map((a) => {
          return a;
        })
      ),
  };
  return ev;
};

export const switchAll = <A>(nested: Event<Event<A>>): Event<A> => undefined as any;

// rename to "fix"?
// https://www.parsonsmatt.org/2016/10/26/grokking_fix.html
export const defer = <A>(ctor: () => Event<A>): Event<A> => {
  const ev: Event<Event<A>> = {
    generator: function* (): Iterable<Event<A>> {
      yield ctor();
      return;
    },
    provenance: new r.BehaviorSubject<symbol[]>([]),
    reactive: r.EMPTY,
  };
  return mergeAll(ev);
};

export const batchSimultaneous = <A>(event: Event<A>): Event<A[]> => undefined as any;
