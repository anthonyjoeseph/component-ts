import * as r from "rxjs";
import {
  initEq,
  Instantaneous,
  InstClose,
  InstEmit,
  InstInit,
  InstInitChild,
  InstValPlain,
  isInit,
  isVal,
  mapInit,
  InstValMerge,
  InstVal,
} from "./types";
import { Async, batchSync, Sync } from "../batch-sync";
import { EMPTY, share } from "./basic-primitives";

const flattenValMerge = <A>(emit: InstValMerge<A>): (InstInitChild<A> | InstValPlain<A>)[] => {
  return emit.values.flatMap((emit): (InstInitChild<A> | InstValPlain<A>)[] =>
    emit.type === "value-merge" ? flattenValMerge(emit) : [emit]
  );
};

const wrapWithParent = <A>(
  emitVal: InstEmit<A>,
  parentInit: InstInit<A>,
  isSync: boolean
): (InstInitChild<A> | InstValPlain<A> | InstClose<A>)[] => {
  const emissions = emitVal.type === "value-merge" ? flattenValMerge(emitVal) : [emitVal];
  return emissions.map((plainEmit) => {
    switch (plainEmit.type) {
      case "init":
        return {
          type: "init-child",
          init: plainEmit,
          parent: {
            isSync,
            init: parentInit,
          },
          syncVals: [],
        } satisfies InstInitChild<A>;
      case "init-child":
        return {
          type: "init-child",
          init: plainEmit,
          parent: {
            isSync,
            init: parentInit,
          },
          syncVals: [],
        } satisfies InstInitChild<A>;
      case "value":
        return {
          type: "value",
          init: {
            type: "init-child",
            init: plainEmit.init,
            parent: {
              isSync,
              init: parentInit,
            },
            syncVals: [],
          } satisfies InstInitChild<A>,
          value: plainEmit.value,
        } satisfies InstValPlain<A>;
      case "close":
        return {
          type: "close",
          init: {
            type: "init-child",
            init: plainEmit.init,
            parent: {
              isSync,
              init: parentInit,
            },
            syncVals: [],
          } satisfies InstInitChild<A>,
        } satisfies InstClose<A>;
    }
  });
};

const wrapChildEmit = <A>(
  childEmitGroup: Sync<InstEmit<A>> | Async<InstEmit<A>>,
  parentInit: InstInit<A>
): InstEmit<A>[] => {
  if (childEmitGroup.type === "sync") {
    const allInits = childEmitGroup.value.filter(isInit);

    const flattened = childEmitGroup.value.flatMap((emit): (InstClose<A> | InstInitChild<A> | InstValPlain<A>)[] =>
      emit.type === "value-merge" ? flattenValMerge(emit) : emit.type === "init" ? [] : [emit]
    );

    const groupedWithVals = allInits.map((init) => {
      const fromStream = flattened.filter((a): a is InstInitChild<A> | InstValPlain<A> | InstClose<A> =>
        initEq(init, a.init)
      );
      return {
        init,
        vals: fromStream.filter((a) => isVal(a)),
        close: fromStream.find((a): a is InstClose<A> => a.type === "close"),
      };
    });

    return groupedWithVals.flatMap(({ init, vals, close }): InstEmit<A>[] => {
      return [
        {
          type: "init-child",
          parent: {
            isSync: true,
            init: parentInit,
          },
          init: init,
          syncVals: vals.flatMap((v) => (v.type === "init-child" ? v.syncVals : [v.value])),
        } satisfies InstInitChild<A>,
        ...(close !== undefined ? [close] : []),
      ];
    });
  } else {
    const childEmit = childEmitGroup.value;
    if (childEmit.type === "init") {
      return [
        {
          type: "init-child",
          parent: {
            isSync: true,
            init: parentInit as InstInit<A>,
          },
          init: childEmit,
          syncVals: [],
        } satisfies InstInitChild<A>,
      ];
    }
    if (isVal(childEmit)) {
      const plainVals = childEmit.type === "value-merge" ? flattenValMerge(childEmit) : [childEmit];
      return plainVals.flatMap((plainVal): (InstInitChild<A> | InstValPlain<A>)[] => {
        if (plainVal.type === "init-child") {
          return [
            {
              type: "init-child",
              parent: {
                isSync: true,
                init: parentInit as InstInit<A>,
              },
              init: plainVal,
              syncVals: [],
            } satisfies InstInitChild<A>,
          ];
        }
        return [
          {
            type: "value",
            init: {
              type: "init-child",
              parent: {
                isSync: true,
                init: parentInit as InstInit<A>,
              },
              init: plainVal.init,
              syncVals: [],
            } satisfies InstInitChild<A>,
            value: plainVal.value,
          } satisfies InstValPlain<A>,
        ];
      });
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
          if (input.type === "init") {
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
          const inits = nested.value.filter((v) => v.type === "init");
          const initChilds = nested.value.filter((v) => v.type === "init-child");
          const values = nested.value.filter((v) => v.type === "value");
          const closes = nested.value.filter((v) => v.type === "close");
          return r.merge(
            ...inits.map((init) => r.of(init)),
            r
              .merge(
                ...initChilds.flatMap((initChild) => {
                  return initChild.syncVals.map((val) => {
                    return val.pipe(
                      r.mergeMap((emit) => {
                        return r.of(
                          ...wrapWithParent(
                            emit,
                            mapInit(initChild, () => []),
                            true
                          )
                        );
                      })
                    );
                  });
                }),
                ...values.map((val) => {
                  return val.value.pipe(
                    r.mergeMap((emit) => {
                      return r.of(
                        ...wrapWithParent(
                          emit,
                          mapInit(val.init, () => []),
                          true
                        )
                      );
                    })
                  );
                })
              )
              .pipe(
                batchSync(),
                r.mergeMap((nestedEmits): Instantaneous<A> => {
                  if (nestedEmits.type === "sync") {
                    const inits = nestedEmits.value.filter((v) => v.type === "init");
                    const initChilds = nestedEmits.value.filter((v) => v.type === "init-child");
                    const values = nestedEmits.value.filter((v) => v.type === "value");
                    const closes = nestedEmits.value.filter((v) => v.type === "close");
                    return r.merge(
                      ...inits.map((x) => r.of(x)),
                      ...initChilds.map((x) => r.of(x)),
                      ...values.map((x) => r.of(x)),
                      ...closes.map((x) => r.of(x))
                    );
                  }
                  return r.of(nestedEmits.value);
                })
              ),
            ...closes.map((c) => r.of({ type: "close", init: mapInit(c.init, () => []) } satisfies InstClose<A>))
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
      if (emit.type === "init") {
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
      if (emit.type === "init") {
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
      if (emit.type === "init") {
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
