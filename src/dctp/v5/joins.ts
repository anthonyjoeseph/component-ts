import * as r from "rxjs";
import { Instantaneous, InstClose, InstEmit, InstInit, init, async, val, close, InstVal, InstAsync } from "./types";
import { batchSync } from "../batch-sync";
import { v4 as uuid } from "uuid";

const flipInside = <A>(emit: InstEmit<Instantaneous<A>>): Instantaneous<A> => {
  if (emit.type === "async") {
    if (emit.child == null || emit.child.type === "close") {
      return r.of(emit as InstAsync<A>);
    }
    if (emit.child.type === "value") {
      return emit.child.value.pipe(
        batchSync(),
        r.map((batch) => {
          if (batch.type === "async") {
            return async({ provenance: emit.provenance, child: batch.value });
          }
          return init({ provenance: emit.provenance, children: batch.value });
        })
      );
    }
    if (emit.child.type === "async") {
      return flipInside(emit.child).pipe(r.map((child) => async({ provenance: emit.provenance, child })));
    }

    return r
      .merge(
        ...emit.child.children.map((child): r.Observable<InstEmit<A>> => {
          if (child.type === "close") {
            return r.of(emit as InstAsync<A>);
          }
          if (child.type === "value") {
            return child.value.pipe(
              batchSync(),
              r.map((batch) => {
                if (batch.type === "async") {
                  return async({ provenance: emit.provenance, child: batch.value });
                }
                return init({ provenance: emit.provenance, children: batch.value });
              })
            );
          }
          return flipInside(child).pipe(
            r.map((child) => {
              if (child.type === "init") {
                return init({ provenance: emit.provenance, children: [child] });
              }
              return async({ provenance: emit.provenance, child });
            })
          );
        })
      )
      .pipe(
        r.map((child) => {
          if (child.type === "init") {
            return init({ provenance: emit.provenance, children: [child] });
          }
          return async({ provenance: emit.provenance, child });
        })
      );
  }

  return r
    .merge(
      ...emit.children.map((child): r.Observable<InstEmit<A> | InstClose> => {
        if (child.type === "close") {
          return r.of(child);
        }
        if (child.type === "value") {
          return child.value.pipe(
            batchSync(),
            r.map((batch) => {
              if (batch.type === "async") {
                return async({ provenance: emit.provenance, child: batch.value });
              }
              return init({ provenance: emit.provenance, children: batch.value });
            })
          );
        }
        return flipInside(child).pipe(
          r.map((child) => {
            if (child.type === "init") {
              return init({ provenance: child.provenance, children: [child] });
            }
            return async({ provenance: child.provenance, child });
          })
        );
      })
    )
    .pipe(
      r.map((child) => {
        if (child.type === "init") {
          return init({ provenance: emit.provenance, children: [child] });
        }
        return async({ provenance: emit.provenance, child });
      })
    );
};

export const switchAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  return insts.pipe(r.map(flipInside), r.switchAll());
};

export const mergeAll =
  (concurrency?: number) =>
  <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
    return insts.pipe(
      batchSync(),
      r.map((batchedParent): Instantaneous<A> => {
        if (batchedParent.type === "async") {
          return flipInside(batchedParent.value);
        }
        return r.merge(...batchedParent.value.map(flipInside)).pipe(
          batchSync(),
          r.map((batched): InstEmit<A> => {
            if (batched.type === "async") {
              return batched.value;
            }
            return init({ provenance: uuid() as unknown as symbol, children: batched.value });
          })
        );
      }),
      r.mergeAll(concurrency)
    );
  };

/* export const concatAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  const sharedInput = share(insts);
  let currentInit: InstInit<A> | undefined;

  const filteredOutputs: Instantaneous<A> = sharedInput.pipe(
    r.switchMap((emit) => {
      if (emit.type === "value" && currentInit !== undefined) {
        return r.of({
          type: "init-child",
          parent: currentInit,
          init: mapInit(emit.init, () => []),
          syncVals: [],
        } satisfies InstInitChild<A>);
      }
      return r.EMPTY;
    })
  );

  return r.merge(
    filteredOutputs, 
    sharedInput.pipe(
      r.map(flipInside), 
      r.concatAll()
    )
  );
};

export const exhaustAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {...}; */
