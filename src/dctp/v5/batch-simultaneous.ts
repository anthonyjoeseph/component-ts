import * as r from "rxjs";
import {
  Instantaneous,
  InstEmit,
  InstAsync,
  async,
  init,
  map as mapPrimitive,
  val,
  InstInit,
  InstClose,
} from "./types";

type ProvenanceState<A> = {
  awaitingValueCount: number | undefined;
  totalNum: number;
  batch: A[];
};

const deleteKey = <K extends string | number | symbol, A>(record: Record<K, A>, key: K): Record<K, A> => {
  const { [key]: _, ...rest } = record;
  return rest as Record<K, A>;
};

const updateMemory = <A>(
  memory: Record<symbol, ProvenanceState<A>>,
  provenance: symbol,
  {
    awaitingValueCount,
    totalNum,
    batchAppend,
  }: {
    awaitingValueCount?: "--";
    totalNum?: "++" | "--";
    batchAppend?: A;
  }
): Record<symbol, ProvenanceState<A>> => {
  const state = memory[provenance];
  const currentCount = state?.awaitingValueCount;
  const currentTotal = state?.totalNum ?? 0;
  const currentBatch = state?.batch ?? [];
  const newTotal = totalNum === "++" ? currentTotal + 1 : totalNum === "--" ? currentTotal - 1 : currentTotal;
  if (newTotal === 0) {
    return deleteKey(memory, provenance);
  }
  const newAwaitingValueCount =
    awaitingValueCount === "--"
      ? currentCount === undefined
        ? newTotal - 1
        : currentCount === 1
          ? undefined
          : currentCount - 1
      : currentCount;
  return {
    ...memory,
    [provenance]: {
      awaitingValueCount: newAwaitingValueCount,
      totalNum: newTotal,
      batch:
        awaitingValueCount === "--" && currentCount === 1
          ? []
          : batchAppend !== undefined
            ? [...currentBatch, batchAppend]
            : currentBatch,
    },
  };
};

const groupInitSiblings = <A>(emit: InstInit<A>, memory: Record<symbol, ProvenanceState<A>>): InstEmit<A[]> | null => {
  const allVals = emit.children.filter((child) => child.type === "value").map((v) => v.value);
  const consolidatedVal = allVals.length > 0 ? [val(allVals)] : [];
  const otherChildren = emit.children
    .filter((child) => child.type !== "value")
    .flatMap((child): (InstClose | InstEmit<A[]>)[] => {
      if (child.type === "close") return [child];
      const maybeNull = batchOrGroup(child, memory);
      return maybeNull == null ? [] : [maybeNull];
    });
  return init({
    provenance: emit.provenance,
    children: [...otherChildren, ...consolidatedVal],
  });
};

const batchAsync = <A>(emit: InstAsync<A>, memory: Record<symbol, ProvenanceState<A>>): InstEmit<A[]> | null => {
  const entry = memory[emit.provenance];
  const awaitingValueCount = entry?.awaitingValueCount;
  const batch = entry?.batch ?? [];
  if (emit.child?.type === "close") {
    return emit as InstEmit<A[]>;
  }
  if (
    (entry !== undefined && entry.awaitingValueCount === undefined) ||
    (awaitingValueCount !== undefined && awaitingValueCount > 1) ||
    (emit.child == null && batch.length === 0)
  ) {
    return null;
  }
  if (emit.child == null || emit.child.type === "value") {
    const childVals = emit.child == null ? [] : [emit.child.value];
    const fullBatch = [...batch, ...childVals];
    return async({ provenance: emit.provenance, child: val(fullBatch) });
  }
  return async({ provenance: emit.provenance, child: batchOrGroup(emit.child, memory) });
};

const batchOrGroup = <A>(emit: InstEmit<A>, memory: Record<symbol, ProvenanceState<A>>): InstEmit<A[]> | null => {
  return emit.type === "init" ? groupInitSiblings(emit, memory) : batchAsync(emit, memory);
};

const updateMemoryFromEmit = <A>(
  emit: InstEmit<A>,
  oldMemory: Record<symbol, ProvenanceState<A>>
): Record<symbol, ProvenanceState<A>> => {
  if (emit.type === "init") {
    const newMemory = updateMemory(oldMemory, emit.provenance, { totalNum: "++" });
    const withChildrensState = emit.children.reduce((acc, child) => {
      if (child.type === "close") {
        return updateMemory(acc, emit.provenance, { totalNum: "--" });
      }
      if (child.type === "value") {
        return updateMemory(acc, emit.provenance, {
          awaitingValueCount: "--",
          batchAppend: child.value,
        });
      }
      return updateMemoryFromEmit(child, acc);
    }, newMemory);

    return withChildrensState;
  }

  if (emit.child?.type === "close") {
    return updateMemory(oldMemory, emit.provenance, { totalNum: "--" });
  }
  if (emit.child?.type === "value") {
    return updateMemory(oldMemory, emit.provenance, { awaitingValueCount: "--", batchAppend: emit.child.value });
  }
  if (emit.child == null) {
    return updateMemory(oldMemory, emit.provenance, { awaitingValueCount: "--" });
  }
  return updateMemoryFromEmit(emit.child, updateMemory(oldMemory, emit.provenance, { awaitingValueCount: "--" }));
};

export const batchSimultaneous = <A>(inst: Instantaneous<A>): Instantaneous<A[]> => {
  return inst.pipe(
    r.scan(
      (
        { memory },
        currentEmit
      ): {
        emit: InstEmit<A[]> | null;
        memory: Record<symbol, ProvenanceState<A>>;
      } => {
        const emit = batchOrGroup(currentEmit, memory);
        const newMemory = updateMemoryFromEmit(currentEmit, memory);
        return {
          emit,
          memory: newMemory,
        };
      },
      { emit: null, memory: {} } as {
        emit: InstEmit<A[]> | null;
        memory: Record<symbol, ProvenanceState<A>>;
      }
    ),
    r.mergeMap(({ emit }) => {
      return emit == null ? r.EMPTY : r.of(emit);
    })
  );
};

/**
 * key:
 *
 * - async value with no provenance in memory:
 *   - means that its parent observable has closed
 *   - can safely ignore
 *   - example - the 'of' in 'of(a, a).pipe(mergeAll())'
 */
