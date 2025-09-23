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
  InstValFiltered,
  InstValPlain,
  InstValSync,
  isInit,
  isVal,
} from "./types";
import { Async, batchSync, Sync } from "../batch-sync";
import range from "lodash/range";
import { share } from "./basic-primitives";

const wrapChildEmit = <A>(
  childEmitGroup: Sync<InstEmit<A>> | Async<InstEmit<A>>,
  parentInit: InstInit
): InstEmit<A>[] => {
  if (childEmitGroup.type === "sync") {
    const allInits = childEmitGroup.value.filter(isInit);

    const groupedWithVals = allInits.map((init) => {
      const fromStream = childEmitGroup.value.filter(
        (a): a is InstVal<A> | InstClose => (isVal(a) || a.type === "close") && initEq(init, a.init)
      );
      return {
        init,
        filteredVals: fromStream.filter((a): a is InstValFiltered => isVal(a) && a.type === "value-filtered"),
        vals: fromStream.filter((a): a is InstValPlain<A> | InstValSync<A> => isVal(a) && a.type !== "value-filtered"),
        close: fromStream.find((a): a is InstClose => a.type === "close"),
      };
    });

    return groupedWithVals.flatMap(({ init, filteredVals, vals, close }): InstEmit<A>[] => {
      return [
        {
          type: "init-child",
          parent: parentInit,
          own: init,
        } satisfies InstInitChild,
        {
          type: "value-sync",
          init: {
            type: "init-child",
            parent: parentInit,
            own: init,
          },
          values: vals.flatMap((v) => (v.type === "value-sync" ? v.values : [v.value])),
        } satisfies InstValSync<A>,
        ...filteredVals,
        ...(close !== undefined ? [close] : []),
      ];
    });
  } else {
    const childEmit = childEmitGroup.value;
    if (isInit(childEmit)) {
      return [
        {
          type: "init-child",
          parent: parentInit as InstInit,
          own: childEmit,
        } satisfies InstInitChild,
      ];
    }
    if (isVal(childEmit)) {
      if (childEmit.type === "value-filtered") {
        return [
          {
            type: "value-filtered",
            init: {
              type: "init-child",
              parent: parentInit as InstInit,
              own: childEmit.init,
            } satisfies InstInitChild,
          } satisfies InstValFiltered,
        ];
      }
      if (childEmit.type === "value-sync") {
        return [
          {
            type: "value-sync",
            init: {
              type: "init-child",
              parent: parentInit as InstInit,
              own: childEmit.init,
            } satisfies InstInitChild,
            values: childEmit.values,
          } satisfies InstValSync<A>,
        ];
      }
      return [
        {
          type: "value",
          init: {
            type: "init-child",
            parent: parentInit as InstInit,
            own: childEmit.init,
          } satisfies InstInitChild,
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
    let parentInit: InstInit;
    const retval = insts.pipe(
      batchSync(),
      r.map((nested) => {
        const handleVal = (input: InstEmit<Instantaneous<A>>): Instantaneous<A> => {
          if (isInit(input)) {
            parentInit = input;
            return r.of(input);
          }
          if (isVal(input)) {
            if (input.type === "value-filtered") return r.of(input);
            if (input.type === "value-sync") {
              return r.merge(
                ...range(0, input.values.length).map(() =>
                  r.of({ type: "value-filtered", init: parentInit as InstInit } satisfies InstValFiltered)
                ),
                ...input.values.map((value) =>
                  value.pipe(
                    batchSync(),
                    r.mergeMap((emit2) => {
                      return r.of(...wrapChildEmit(emit2, parentInit as InstInit));
                    })
                  )
                )
              );
            }
            return r.merge(
              r.of({ type: "value-filtered", init: input.init as InstInit } satisfies InstValFiltered),
              input.value.pipe(
                batchSync(),
                r.mergeMap((emit2) => {
                  return r.of(...wrapChildEmit(emit2, parentInit as InstInit));
                })
              )
            );
          }
          return r.of(input);
        };

        if (nested.type === "sync") {
          const inits = nested.value.filter(isInit);
          const nonInits = nested.value.filter((x) => !isInit(x));
          parentInit = {
            type: "init-merge",
            children: inits,
            numSyncChildren: nonInits.filter(isVal).length, // everything but the 'closes'
          } satisfies InstInitMerge;
          return r.merge(r.of(parentInit), ...nonInits.map(handleVal));
        }
        return handleVal(nested.value);
      }),
      r.mergeAll(concurrent)
    );
    return retval;
  };

export const switchAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  let previousInit: InstInit | undefined;
  return insts.pipe(
    r.map((emit): Instantaneous<A> => {
      const closePrev =
        previousInit !== undefined ? r.of({ type: "close", init: previousInit } satisfies InstClose) : r.EMPTY;
      if (isInit(emit)) {
        previousInit = emit;
        return r.merge(closePrev, r.of(emit));
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") return r.of(emit);
        if (emit.type === "value-sync") {
          if (emit.values.length === 0)
            return r.of({ type: "value-filtered", init: previousInit as InstInit } satisfies InstValFiltered);

          // we only need to subscribe to the most recent one,
          // since this is switchMap
          // but we do need to emit filtered values for all of them
          const lastValue = emit.values[emit.values.length - 1]!;
          return r.merge(
            ...range(0, emit.values.length).map(() =>
              r.of({ type: "value-filtered", init: previousInit as InstInit } satisfies InstValFiltered)
            ),
            lastValue.pipe(
              batchSync(),
              r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, previousInit as InstInit)))
            )
          );
        }
        if (emit.type === "value") {
          return r.merge(
            r.of({ type: "value-filtered", init: previousInit as InstInit } satisfies InstValFiltered),
            emit.value.pipe(
              batchSync(),
              r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, previousInit as InstInit)))
            )
          );
        }
      }

      // if we close before the next parent comes in
      previousInit = undefined;
      return r.of(emit);
    }),
    r.switchAll()
  );
};

export const concatAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  const sharedInput = share(insts);

  const filteredOutputs: Instantaneous<A> = sharedInput.pipe(
    r.switchMap((emit) => {
      if (isInit(emit)) {
        return r.of(emit);
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") {
          return r.of(emit);
        }
        return r.of({ type: "value-filtered", init: emit.init } satisfies InstValFiltered);
      }
      return r.EMPTY;
    })
  );

  let currentInit: InstInit | undefined;
  const concatOutputs: Instantaneous<A> = sharedInput.pipe(
    r.map((emit): Instantaneous<A> => {
      if (isInit(emit)) {
        currentInit = emit;
        return r.EMPTY;
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") return r.EMPTY;
        if (emit.type === "value-sync") {
          return r.merge(
            ...range(0, emit.values.length).map(() =>
              r.of({ type: "value-filtered", init: currentInit as InstInit } satisfies InstValFiltered)
            ),
            ...emit.values.map((value) =>
              value.pipe(
                batchSync(),
                r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit)))
              )
            )
          );
        }
        if (emit.type === "value") {
          return emit.value.pipe(
            batchSync(),
            r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit)))
          );
        }
      }

      // if we close before the next parent comes in
      currentInit = undefined;
      return r.of(emit);
    }),
    r.concatAll()
  );

  return r.merge(filteredOutputs, concatOutputs);
};

export const exhaustAll = <A>(insts: Instantaneous<Instantaneous<A>>): Instantaneous<A> => {
  const sharedInput = share(insts);

  const filteredOutputs: Instantaneous<A> = sharedInput.pipe(
    r.switchMap((emit) => {
      if (isInit(emit)) {
        return r.of(emit);
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") {
          return r.of(emit);
        }
        return r.of({ type: "value-filtered", init: emit.init } satisfies InstValFiltered);
      }
      return r.EMPTY;
    })
  );

  let currentInit: InstInit | undefined;
  const exhaustOutputs: Instantaneous<A> = sharedInput.pipe(
    r.map((emit): Instantaneous<A> => {
      if (isInit(emit)) {
        currentInit = emit;
        return r.EMPTY;
      }
      if (isVal(emit)) {
        if (emit.type === "value-filtered") return r.EMPTY;
        if (emit.type === "value-sync") {
          return r.merge(
            ...range(0, emit.values.length).map(() =>
              r.of({ type: "value-filtered", init: currentInit as InstInit } satisfies InstValFiltered)
            ),
            ...emit.values.map((value) =>
              value.pipe(
                batchSync(),
                r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit)))
              )
            )
          );
        }
        if (emit.type === "value") {
          return emit.value.pipe(
            batchSync(),
            r.mergeMap((emit2) => r.of(...wrapChildEmit(emit2, currentInit as InstInit)))
          );
        }
      }

      // if we close before the next parent comes in
      currentInit = undefined;
      return r.of(emit);
    }),
    r.concatAll()
  );

  return r.merge(filteredOutputs, exhaustOutputs);
};
