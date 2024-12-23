import * as r from "rxjs";
import { DOMAction } from "../lib/state/array/domAction";
import { RxDynamicNode, RxNode, DynamicAction, DynamicChildAction, StaticAction } from "./element";
import { Element } from "hast";

type InternalMemory = {
  permanentId: number;
  relativeIndex: number;
  absoluteIndex: number;
  length: number;
  finish: r.Subject<void>;
};

const range = (start: number, end: number) => new Array<number>(end - start).fill(0).map((_, index) => start + index);

const insertChildren = (
  index: number,
  numberOfChildren: number,
  memory: InternalMemory[],
  latestPermanentId: number
): void => {
  for (const memoryIndex of range(0, memory.length)) {
    const entry = memory[memoryIndex];
    if (entry.relativeIndex >= index) {
      entry.relativeIndex += numberOfChildren;
    }
    if (entry.absoluteIndex >= index) {
      entry.absoluteIndex += numberOfChildren;
    }
  }
  const newEntries: InternalMemory[] = range(0, numberOfChildren).map((childIndex) => ({
    permanentId: latestPermanentId + childIndex,
    relativeIndex: index,
    absoluteIndex: index + childIndex,
    length: childIndex === 0 ? numberOfChildren : 1,
    finish: new r.Subject<void>(),
  }));
  memory.splice(index, 0, ...newEntries);
};

const removeChild = (absoluteIndex: number, memory: InternalMemory[]) => {
  for (const memoryIndex of range(0, memory.length)) {
    const entry = memory[memoryIndex];
    if (entry.absoluteIndex >= absoluteIndex) {
      entry.absoluteIndex--;
    }
  }
  memory.splice(absoluteIndex, 1);
};

const moveChildren = (sourceAbsoluteIndex: number, destinationAbsoluteIndex: number, memory: InternalMemory[]) => {
  const child = memory[sourceAbsoluteIndex];
  if (destinationAbsoluteIndex < sourceAbsoluteIndex) {
    for (const memoryIndex of range(0, memory.length)) {
      const entry = memory[memoryIndex];
      if (entry.absoluteIndex >= destinationAbsoluteIndex && entry.absoluteIndex <= sourceAbsoluteIndex) {
        entry.absoluteIndex++;
      }
    }
    memory.splice(sourceAbsoluteIndex, 1);
    memory.splice(destinationAbsoluteIndex, 0, child);
  } else {
    for (const memoryIndex of range(0, memory.length)) {
      const entry = memory[memoryIndex];
      if (entry.absoluteIndex >= sourceAbsoluteIndex && entry.absoluteIndex <= destinationAbsoluteIndex) {
        entry.absoluteIndex--;
      }
    }
    memory.splice(sourceAbsoluteIndex, 1);
    memory.splice(destinationAbsoluteIndex - 1, 0, child);
  }
};

const convertChildAction = (
  action: StaticAction | DynamicAction,
  permanentId: number,
  memory: InternalMemory[]
): DynamicAction[] => {
  const memoryItem = memory.find((im) => im.permanentId === permanentId);
  const index = memoryItem.absoluteIndex;
  if (action.type === "modify") {
    return [{ type: "dynamic-modify", index, action }];
  } else if (action.type === "init") {
    return [{ type: "dynamic-init", index, action: action }];
  } else if (action.type === "child") {
    return [
      {
        type: "dynamic-child-ancestor",
        targetId: action.targetId,
        domAction: action.domAction,
      },
    ];
  } else if (action.type === "dynamic-child-ancestor") {
    return [action];
  } else if (action.type === "dynamic-modify") {
    return [{ type: "dynamic-modify", index: index + action.index, action: action.action }];
  } else if (action.type === "dynamic-init") {
    return [{ type: "dynamic-init", index: index + action.index, action: action.action }];
  } else if (action.type === "dynamic-child") {
    if (action.domAction.type === "replaceAll") {
      const replaces = range(0, Math.min(memoryItem.length, action.domAction.items.length)).map(
        (childIndex): DynamicChildAction => ({
          type: "dynamic-child",
          domAction: {
            type: "replaceAt",
            index: index + childIndex,
            items: [(action.domAction as { items: Element[] }).items[childIndex]],
          },
        })
      );
      const deletes =
        memoryItem.length > action.domAction.items.length
          ? range(action.domAction.items.length, memoryItem.length).map(
              (childIndex): DynamicChildAction => ({
                type: "dynamic-child",
                domAction: {
                  type: "deleteAt",
                  index: childIndex,
                },
              })
            )
          : [];
      const inserts: DynamicChildAction[] =
        memoryItem.length < action.domAction.items.length
          ? [
              {
                type: "dynamic-child",
                domAction: {
                  type: "insertAt",
                  index: memoryItem.length,
                  items: action.domAction.items.slice(memoryItem.length),
                },
              },
            ]
          : [];
      return [...replaces, ...deletes, ...inserts];
    } else if (action.domAction.type === "prepend") {
      return [{ type: "dynamic-child", domAction: { type: "insertAt", index, items: action.domAction.items } }];
    } else if (
      action.domAction.type === "deleteAt" ||
      action.domAction.type === "insertAt" ||
      action.domAction.type === "replaceAt"
    ) {
      return [{ type: "dynamic-child", domAction: { ...action.domAction, index: index + action.domAction.index } }];
    } else if (action.domAction.type === "move") {
      return [
        {
          type: "dynamic-child",
          domAction: {
            type: "move",
            source: index + action.domAction.source,
            destination: index + action.domAction.destination,
          },
        },
      ];
    }
  }
};

const recordChildAction = (action: DynamicAction, permanentId: number, memory: InternalMemory[]): void => {
  if (action.type === "dynamic-modify" || action.type === "dynamic-child-ancestor") {
    // do nothing
  } else if (action.type === "dynamic-init") {
    for (const memoryIndex of range(0, memory.length)) {
      const entry = memory[memoryIndex];
      if (entry.absoluteIndex >= action.index) {
        entry.absoluteIndex++;
        entry.relativeIndex++;
      }
    }
    const newEntry: InternalMemory = {
      permanentId,
      relativeIndex: action.index,
      absoluteIndex: action.index,
      length: 1,
      finish: new r.Subject<void>(),
    };
    memory.splice(action.index, 0, newEntry);
  } else if (action.type === "dynamic-child") {
    if (action.domAction.type === "deleteAt") {
      removeChild(action.domAction.index, memory);
    } else if (action.domAction.type === "replaceAt") {
      removeChild(action.domAction.index, memory);
      insertChildren(action.domAction.index, action.domAction.items.length, memory, permanentId);
    } else if (action.domAction.type === "insertAt") {
      insertChildren(action.domAction.index, action.domAction.items.length, memory, permanentId);
    } else if (action.domAction.type === "move") {
      moveChildren(action.domAction.source, action.domAction.destination, memory);
    } else if (action.domAction.type === "prepend") {
      insertChildren(0, action.domAction.items.length, memory, permanentId);
    } else if (action.domAction.type === "replaceAll") {
      for (const childIndex of range(0, memory.length)) {
        removeChild(childIndex, memory);
      }
      insertChildren(0, action.domAction.items.length, memory, permanentId);
    }
  }
};

// TODO: out of bounds errors
export const array = (children: r.Observable<DOMAction<RxNode>>): RxDynamicNode => {
  const memory = [] as InternalMemory[];
  let latestPermanentId = 0;
  return children.pipe(
    r.mergeMap((action): r.Observable<DynamicAction> => {
      if (action.type === "deleteAt" || action.type === "replaceAt") {
        const finisher = memory.find((im) => im.absoluteIndex === action.index).finish;
        finisher.next();
        finisher.complete();
        removeChild(action.index, memory);
        if (action.type === "deleteAt") return r.of({ type: "dynamic-child", domAction: action } as DynamicChildAction);
      }
      if (action.type === "replaceAll") {
        memory.forEach((im) => {
          im.finish.next();
          im.finish.complete();
          removeChild(im.absoluteIndex, memory);
        });
      }
      if (
        action.type === "insertAt" ||
        action.type === "prepend" ||
        action.type === "replaceAt" ||
        action.type === "replaceAll"
      ) {
        const initialPermanentId = latestPermanentId;
        latestPermanentId += action.items.length;
        insertChildren(
          action.type === "prepend" || action.type === "replaceAll" ? 0 : action.index,
          action.items.length,
          memory,
          latestPermanentId
        );
        return r.merge(
          ...action.items.map((childActions, childIndex) => {
            const permanentId = initialPermanentId + childIndex;
            return childActions.pipe(
              r.mergeMap((childAction) => {
                const convertedActions = convertChildAction(childAction, permanentId, memory);
                for (const convertedAction of convertedActions) {
                  recordChildAction(convertedAction, permanentId, memory);
                }
                return r.of(...convertedActions);
              }),
              r.takeUntil(memory.find((im) => im.permanentId === permanentId).finish)
            );
          })
        );
      } else if (action.type === "move") {
        moveChildren(action.source, action.destination, memory);
        return r.of({ type: "dynamic-child", domAction: action } as DynamicChildAction);
      }
    })
  );
};
