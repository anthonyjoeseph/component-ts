import * as r from "rxjs";
import { Instantaneous, InstEmit, InstAsync, async, init, map as mapPrimitive, val } from "./types";

type ProvenanceState<A> = {
  awaitingValueCount: number;
  totalNum: number;
  batch: A[];
};

const mergeObjs = <K extends string | symbol | number, A>(arr: Record<K, A>[]): Record<K, A> => {
  return arr.reduce((acc, cur) => ({ ...acc, ...cur }), {} as Record<K, A>);
};

const groupInitSiblings = <A>(emit: InstEmit<A>): InstEmit<A[]> => {
  if (emit.type === "async") {
    if (emit.child == null || emit.child.type === "close") {
      return emit as InstEmit<A[]>;
    }
    if (emit.child.type === "value") {
      return async({ provenance: emit.provenance, child: val([emit.child.value]) });
    }
    return groupInitSiblings(emit);
  }
  const consolidatedVal = val(emit.children.filter((child) => child.type === "value").map((v) => v.value));
  const otherChildren = emit.children
    .filter((child) => child.type !== "value")
    .map((child) => {
      if (child.type === "close") return child;
      return groupInitSiblings(child);
    });
  return init({
    provenance: emit.provenance,
    children: [...otherChildren, consolidatedVal],
  });
};

const batchAsync = <A>(emit: InstAsync<A>, memory: Record<symbol, ProvenanceState<A>>): InstEmit<A[]> | null => {
  const entry = memory[emit.provenance]!;
  const awaitingValueCount = entry?.awaitingValueCount ?? Number.POSITIVE_INFINITY;
  if (awaitingValueCount > 0) {
    return null;
  }
  const fullBatch = emit.child?.type === "value" ? [...entry.batch, emit.child.value] : entry.batch;
  return async({ provenance: emit.provenance, child: val(fullBatch) });
};

const updateMemory = <A>(
  emit: InstEmit<A>,
  oldMemory: Record<symbol, ProvenanceState<A>>
): Record<symbol, ProvenanceState<A>> => {
  if (emit.type === "init") {
    const totalNum = oldMemory[emit.provenance]?.totalNum ?? 0;
    const newState: ProvenanceState<A> = {
      awaitingValueCount: oldMemory[emit.provenance]?.awaitingValueCount ?? 0,
      batch: oldMemory[emit.provenance]?.batch ?? [],
      totalNum,
    };
    return {
      ...oldMemory,
      [emit.provenance]: newState,
      ...mergeObjs(
        emit.children.map((child) => {
          if (child.type === "close") {
            return oldMemory;
          }
          if (child.type === "value") {
            return {};
          }
          return updateMemory(child, { ...oldMemory, [emit.provenance]: newState });
        })
      ),
    };
  }
  const oldEntry = oldMemory[emit.provenance];
  const awaitingValueCount = oldEntry ? oldEntry.awaitingValueCount - 1 : 0;
  const newState: ProvenanceState<A> = {
    awaitingValueCount,
    batch: oldEntry?.batch ?? [],
    totalNum: oldEntry?.totalNum ?? 1,
  };
  if (emit.child == null || emit.child.type === "close") {
    return {
      ...oldMemory,
      [emit.provenance]: newState,
    };
  }
  if (emit.child.type === "value") {
    return {
      ...oldMemory,
      [emit.provenance]: newState,
    };
  }
  return {
    ...oldMemory,
    [emit.provenance]: newState,
    ...updateMemory(emit.child, { ...oldMemory, [emit.provenance]: newState }),
  };
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
        console.log(currentEmit);
        if (currentEmit.type === "init") {
          return {
            emit: currentEmit.children.length === 0 ? null : groupInitSiblings(currentEmit),
            memory: updateMemory(currentEmit, memory),
          };
        }
        return {
          emit: batchAsync(currentEmit, memory),
          memory: updateMemory(currentEmit, memory),
        };
      },
      { emit: null, memory: {} } as {
        emit: InstEmit<A[]> | null;
        memory: Record<symbol, ProvenanceState<A>>;
      }
    ),
    r.mergeMap(({ emit }) => (emit == null ? r.EMPTY : r.of(emit)))
  );
};
