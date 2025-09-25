import * as r from "rxjs";
import {
  initEq,
  Instantaneous,
  InstClose,
  InstEmit,
  InstInit,
  InstInitChild,
  InstInitMerge,
  InstVal,
  InstValPlain,
  isInit,
  isVal,
  mapInit,
  mapVal,
} from "./types";
import { Async, batchSync, Sync } from "../batch-sync";
import range from "lodash/range";
import { EMPTY, share } from "./basic-primitives";

const wrapChildEmit = <A>(
  childEmitGroup: Sync<InstEmit<A>> | Async<InstEmit<A>>,
  parentInit: InstInit<A>
): InstEmit<A>[] => {
  if (childEmitGroup.type === "sync") {
    const allInits = childEmitGroup.value.filter(isInit);

    const groupedWithVals = allInits.map((init) => {
      const fromStream = childEmitGroup.value.filter(
        (a): a is InstVal<A> | InstClose<A> => (isVal(a) || a.type === "close") && initEq(init, a.init)
      );
      return {
        init,
        vals: fromStream.filter(isVal),
        close: fromStream.find((a): a is InstClose<A> => a.type === "close"),
      };
    });

    return groupedWithVals.flatMap(({ init, vals, close }): InstEmit<A>[] => {
      return [
        {
          type: "init-child",
          parent: parentInit,
          init: init,
          syncVals: vals.flatMap((v) => (v.type === "init-child" ? v.syncVals : [v.value])),
        } satisfies InstInitChild<A>,
        ...(close !== undefined ? [close] : []),
      ];
    });
  } else {
    const childEmit = childEmitGroup.value;
    if (childEmit.type === "init" || childEmit.type === "init-merge") {
      return [
        {
          type: "init-child",
          parent: parentInit as InstInit<A>,
          init: childEmit,
          syncVals: [],
        } satisfies InstInitChild<A>,
      ];
    }
    if (isVal(childEmit)) {
      if (childEmit.type === "init-child") {
        return [
          {
            type: "init-child",
            parent: parentInit as InstInit<A>,
            init: childEmit,
            syncVals: [],
          } satisfies InstInitChild<A>,
        ];
      }
      return [
        {
          type: "value",
          init: {
            type: "init-child",
            parent: parentInit as InstInit<A>,
            init: childEmit.init,
            syncVals: [],
          } satisfies InstInitChild<A>,
          value: childEmit.value,
        } satisfies InstValPlain<A>,
      ];
    }
    return [childEmit];
  }
};

export const mergeAll =
  <A>(concurrent?: number) =>
  (insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
    const retval = insts.pipe(
      batchSync(),
      r.map((nested) => {
        const handleVal = (
          parentInit: { contained: InstInit<A> },
          input: InstEmit<Instantaneous<A>>
        ): Instantaneous<A> => {
          if (input.type === "init" || input.type === "init-merge") {
            parentInit.contained = mapInit(input, () => []);
            return r.of(parentInit.contained);
          }
          if (isVal(input)) {
            if (input.type === "init-child") {
              return r.merge(
                ...input.syncVals.map((value) =>
                  value.pipe(
                    batchSync(),
                    r.mergeMap((emit2) => {
                      return r.of(...wrapChildEmit(emit2, parentInit.contained));
                    })
                  )
                )
              );
            }
            return r.merge(
              input.value.pipe(
                batchSync(),
                r.mergeMap((emit2) => {
                  return r.of(...wrapChildEmit(emit2, parentInit.contained));
                })
              )
            );
          }
          return r.of({ type: "close", init: mapInit(input.init, () => []) });
        };

        if (nested.type === "sync") {
          const inits = nested.value.filter(isInit);
          const nonInits = nested.value.filter((x) => !isInit(x));
          const storedParentInits = range(0, nonInits.length).map(() => ({ contained: null as never }));
          return r.merge(
            r.of({
              type: "init-merge",
              syncParents: inits.map((init) => mapInit(init, () => [])),
              numSyncChildren: nonInits.filter(isVal).length, // everything but the 'closes'
            } satisfies InstInitMerge<A>),
            ...nonInits.map((val, index) => handleVal(storedParentInits[index]!, val))
          );
        }
        const asyncParentInit = { contained: null as never };
        return handleVal(asyncParentInit, nested.value);
      }),
      r.mergeAll(concurrent)
    );
    return retval;
  };

export const switchAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  let previousInit: InstInit<A> | undefined;
  return insts.pipe(
    r.map((emit): Instantaneous<A> => {
      const closePrev =
        previousInit !== undefined ? r.of({ type: "close", init: previousInit } satisfies InstClose<A>) : r.EMPTY;
      if (emit.type === "init" || emit.type === "init-merge") {
        previousInit = mapInit(emit, () => []);
        return r.merge(closePrev, r.of(previousInit));
      }
      if (isVal(emit)) {
        if (emit.type === "init-child") {
          if (emit.syncVals.length === 0) return EMPTY;

          // we only need to subscribe to the most recent one,
          // since this is switchMap
          // but we do need to emit filtered values for all of them
          const lastValue = emit.syncVals[emit.syncVals.length - 1]!;
          return r.merge(
            lastValue.pipe(
              batchSync(),
              r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, previousInit as InstInit<A>)))
            )
          );
        }
        if (emit.type === "value") {
          return emit.value.pipe(
            batchSync(),
            r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, previousInit as InstInit<A>)))
          );
        }
      }

      // if we close before the next parent comes in
      previousInit = undefined;
      return r.of({ type: "close", init: mapInit(emit.init, () => []) } satisfies InstClose<A>);
    }),
    r.switchAll()
  );
};

export const concatAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
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

  const concatOutputs: Instantaneous<A> = sharedInput.pipe(
    r.map((emit): Instantaneous<A> => {
      if (emit.type === "init" || emit.type === "init-merge") {
        currentInit = mapInit(emit, () => []);
        return r.of(currentInit);
      }
      if (isVal(emit)) {
        if (emit.type === "init-child") {
          return r.merge(
            ...emit.syncVals.map((value) =>
              value.pipe(
                batchSync(),
                r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit<A>)))
              )
            )
          );
        }
        if (emit.type === "value") {
          return emit.value.pipe(
            batchSync(),
            r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit<A>)))
          );
        }
      }

      // if we close before the next parent comes in
      currentInit = undefined;
      return r.of({ type: "close", init: mapInit(emit.init, () => []) } satisfies InstClose<A>);
    }),
    r.concatAll()
  );

  return r.merge(filteredOutputs, concatOutputs);
};

export const exhaustAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
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

  const exhaustOutputs: Instantaneous<A> = sharedInput.pipe(
    r.map((emit): Instantaneous<A> => {
      if (emit.type === "init" || emit.type === "init-merge") {
        currentInit = mapInit(emit, () => []);
        return r.of(currentInit);
      }
      if (isVal(emit)) {
        if (emit.type === "init-child") {
          return r.merge(
            ...emit.syncVals.map((value) =>
              value.pipe(
                batchSync(),
                r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit<A>)))
              )
            )
          );
        }
        if (emit.type === "value") {
          return emit.value.pipe(
            batchSync(),
            r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit<A>)))
          );
        }
      }

      // if we close before the next parent comes in
      currentInit = undefined;
      return r.of({ type: "close", init: mapInit(emit.init, () => []) } satisfies InstClose<A>);
    }),
    r.exhaustAll()
  );

  return r.merge(filteredOutputs, exhaustOutputs);
};
