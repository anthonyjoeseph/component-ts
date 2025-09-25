import * as r from "rxjs";
import Observable = r.Observable;
import {
  initEq,
  Instantaneous,
  InstClose,
  InstEmit,
  InstInit,
  InstInitChild,
  InstInitMerge,
  InstInitPlain,
  InstVal,
  InstValPlain,
  isInit,
  isVal,
  mapInit,
  mapVal,
} from "./types";
import ArrayKeyedMap from "array-keyed-map";

type ProvenanceState<A> = {
  mergeParentSiblings: symbol[];
  awaitingInitCount: number;
  awaitingValueCount: number;
  totalNum: number;
  batch: A[];
};

const updateMap = <K, A>(aMap: Map<K, A>, key: K, fn: (a: A) => A): void => {
  const val = aMap.get(key);
  aMap.set(key, fn(val!));
};

// stack safe!
const actOnInit = <A>(
  init: InstInit<A>,
  actions: {
    plain?: (val: InstInitPlain) => void;
    merge?: (val: InstInitMerge<A>) => void;
    child?: (val: InstInitChild<A>) => void;
  }
) => {
  let initQueue: InstInit<A>[] = [];
  let currentInit: InstInit<A> | undefined = init;
  while (currentInit !== undefined) {
    switch (currentInit.type) {
      case "init":
        actions.plain?.(currentInit);
        break;
      case "init-merge":
        actions.merge?.(currentInit);
        initQueue.push(...currentInit.syncParents);
        break;
      case "init-child":
        actions.child?.(currentInit);
        initQueue.push(currentInit.parent);
        initQueue.push(currentInit.init);
        break;
    }
    currentInit = initQueue.pop();
  }
};

const getProvenance = <A>(init: InstInit<A>): symbol => {
  let initQueue: InstInit<A>[] = [];
  let currentInit: InstInit<A> | undefined = init;
  while (currentInit !== undefined) {
    switch (currentInit.type) {
      case "init":
        return currentInit.provenance;
      case "init-merge":
        initQueue.push(...currentInit.syncParents);
        break;
      case "init-child":
        initQueue.push(currentInit.parent);
        initQueue.push(currentInit.init);
        break;
    }
    currentInit = initQueue.pop();
  }
  throw new Error("could not find provenance!");
};

const canEmitBatch = <A>(memory: Map<symbol, ProvenanceState<A>>, value: InstVal<A>): boolean => {
  if (value.type === "value") {
    const init = value.init;
    if (init.type === "init-child") {
      const parentProv = getProvenance(init.parent);
      const parentState = memory.get(parentProv)!;
      if (parentState.awaitingInitCount > 0) {
        updateMap(memory, parentProv, (state) => ({ ...state, awaitingInitCount: state.awaitingInitCount - 1 }));
        return false;
      }
    }
    return true;
  } else {
    const parentProv = getProvenance(value.parent);
    const parentState = memory.get(parentProv)!;
    if (parentState.awaitingInitCount > 0) {
      updateMap(memory, parentProv, (state) => ({ ...state, awaitingInitCount: state.awaitingInitCount - 1 }));
      return false;
    }
    return true;
  }
};

export const batchSimultaneous = <A>(inst: Instantaneous<A>): Instantaneous<A[]> => {
  const memory = new Map<symbol, ProvenanceState<A>>();
  return inst.pipe(
    r.mergeMap((a) => {
      console.log(a);
      switch (a.type) {
        case "init-child":
          const provenanceIC = getProvenance(a.init);

          if (memory.has(provenanceIC)) {
            updateMap(memory, provenanceIC, (state) => {
              return {
                ...state,
                awaitingValueCount: state.awaitingValueCount - 1,
                batch: [...state.batch, ...a.syncVals],
              };
            });
          } else {
            memory.set(provenanceIC, {
              mergeParentSiblings: [],
              awaitingInitCount: 0,
              awaitingValueCount: 0,
              batch: a.syncVals,
              totalNum: 1,
            });
          }

          if (canEmitBatch(memory, a)) {
            const memoryEntry = memory.get(provenanceIC)!;
            return r.of({
              type: "init-child",
              parent: mapInit(a.parent, () => []),
              init: mapInit(a.init, () => []),
              syncVals: [memoryEntry.batch, a.syncVals],
            } satisfies InstInitChild<A[]>);
          }
          return r.EMPTY;
        case "init-merge":
          const allSiblings = a.syncParents.map(getProvenance);
          for (const parentInit of a.syncParents) {
            const provenanceIM = getProvenance(parentInit);

            if (memory.has(provenanceIM)) {
              updateMap(memory, provenanceIM, (state) => {
                return {
                  ...state,
                  totalNum: state.totalNum + 1,
                };
              });
            } else {
              memory.set(provenanceIM, {
                mergeParentSiblings: allSiblings.filter((s) => s !== provenanceIM),
                awaitingInitCount: allSiblings.filter((s) => s === provenanceIM).length,
                awaitingValueCount: 0,
                batch: [],
                totalNum: allSiblings.filter((s) => s === provenanceIM).length,
              });
            }
          }
          return r.EMPTY;
        case "init":
          if (memory.has(a.provenance)) {
            updateMap(memory, a.provenance, (state) => {
              return {
                ...state,
                totalNum: state.totalNum + 1,
              };
            });
            return r.EMPTY;
          }
          memory.set(a.provenance, {
            mergeParentSiblings: [],
            awaitingInitCount: 0,
            awaitingValueCount: 0,
            batch: [],
            totalNum: 1,
          });
          return r.of(a);
        case "value":
          const provenanceV = getProvenance(a.init);
          updateMap(memory, provenanceV!, (state) => {
            return {
              ...state,
              awaitingValueCount: state.awaitingValueCount - 1,
              batch: [...state.batch, a.value],
            };
          });
          if (canEmitBatch(memory, a)) {
            const memoryEntry = memory.get(provenanceV)!;
            return r.of({
              type: "value",
              init: mapInit(a.init, () => []),
              value: memoryEntry.batch,
            } satisfies InstValPlain<A[]>);
          }
          return r.EMPTY;
        case "close":
          let totalNumLeft = 0;
          actOnInit(a.init, {
            plain: (plainInit) => {
              updateMap(memory, plainInit.provenance, (provState) => {
                totalNumLeft = provState.totalNum - 1;
                return {
                  ...provState,
                  totalNum: provState.totalNum - 1,
                };
              });
            },
          });
          if (totalNumLeft === 0) {
            return r.of(mapInit(a.init, () => []));
          } else {
            return r.EMPTY;
          }
      }
    })
  );
};

/**
 * NOTES
 * - can we get rid of the "take" stuff in the emit types?
 *   - the "close" events should be enough, no?
 * - after an 'init-merge', there will always be a constant number of 'init-childs', equal to the number emitted by the topmost 'batchSync'
 *   - we should wait for these
 * - inits & closes should be changed - output different from input
 *   - only one 'init' and one 'close' per provenance, since they are batched
 *   - 'InstValSync' parent's provenance should also be included
 *     - this covers all cases with "multiple" provenances
 *       - e.g. parent.switchMap(e => of(e))
 *         it technically emits on it's parent's provenance
 *         but it also has its child's provenance (the 'of')
 *     - this also means that 'InitChild' must be preserved, so that
 *       any deeper 'batchSimul' fns will have access to parent info
 */
