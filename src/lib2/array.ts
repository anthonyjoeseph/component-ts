import * as r from "rxjs";
import { DOMAction } from "../lib/state/array/domAction";
import { RxDynamicNode, RxNode, DynamicAction, DynamicChildAction, StaticAction, InitAction } from "./element";
import { Element } from "hast";
import { element as e } from "./element";
import { h } from "hastscript";
import { createAsyncStart } from "./util";

type InternalMemory = {
  permanentId: number;
  relativeIndex: number;
  length: number;
  finish: r.Subject<void>;
};

const sum = (nums: number[]): number => nums.reduce((acc, cur) => acc + cur, 0);
const range = (start: number, end: number) => new Array<number>(end - start).fill(0).map((_, index) => start + index);

const getAbsoluteIndex = (permanentId: number, memory: InternalMemory[]) => {
  const relativeIndex = memory.find((im) => im.permanentId === permanentId).relativeIndex;
  return sum(memory.filter((im) => im.relativeIndex < relativeIndex).map((im) => im.length));
};

const insertChildren = (
  relativeIndex: number,
  numberOfChildren: number,
  memory: InternalMemory[],
  latestPermanentId: number
): void => {
  for (const memoryIndex of range(0, memory.length)) {
    const entry = memory[memoryIndex];
    if (entry.relativeIndex >= relativeIndex) {
      entry.relativeIndex += numberOfChildren;
    }
  }
  const newEntries: InternalMemory[] = range(0, numberOfChildren).map((childIndex) => ({
    permanentId: latestPermanentId + childIndex,
    relativeIndex: relativeIndex + childIndex,
    length: 0,
    finish: new r.Subject<void>(),
  }));
  memory.splice(relativeIndex, 0, ...newEntries);
};

const removeChild = (relativeIndex: number, memory: InternalMemory[]) => {
  const indexOfChild = memory.findIndex((im) => im.relativeIndex === relativeIndex);
  const currentEntry = memory[indexOfChild];
  for (const memoryIndex of range(0, memory.length)) {
    const entry = memory[memoryIndex];
    if (entry.relativeIndex >= currentEntry.relativeIndex) {
      entry.relativeIndex--;
    }
  }
  memory.splice(indexOfChild, 1);
};

const moveChildren = (sourceRelativeIndex: number, destinationRelativeIndex: number, memory: InternalMemory[]) => {
  const sourceElem = memory.find((im) => im.relativeIndex === sourceRelativeIndex);
  if (destinationRelativeIndex < sourceRelativeIndex) {
    for (const memoryIndex of range(0, memory.length)) {
      const entry = memory[memoryIndex];
      if (entry.relativeIndex >= destinationRelativeIndex && entry.relativeIndex < sourceRelativeIndex) {
        entry.relativeIndex++;
      }
    }
  } else {
    for (const memoryIndex of range(0, memory.length)) {
      const entry = memory[memoryIndex];
      if (entry.relativeIndex > sourceRelativeIndex && entry.relativeIndex <= destinationRelativeIndex) {
        entry.relativeIndex--;
      }
    }
  }
  sourceElem.relativeIndex = destinationRelativeIndex;
};

const convertChildAction = (
  action: StaticAction | DynamicAction,
  permanentId: number,
  memory: InternalMemory[]
): DynamicAction[] => {
  const memoryItem = memory.find((im) => im.permanentId === permanentId);
  const absoluteIndex = getAbsoluteIndex(permanentId, memory);
  if (action.type === "modify") {
    return [{ type: "dynamic-modify", index: absoluteIndex, action }];
  } else if (action.type === "init") {
    return [{ type: "dynamic-init", index: absoluteIndex, action: action }];
  } else if (action.type === "child") {
    return [
      {
        type: "dynamic-child-ancestor",
        targetId: action.targetId,
        domAction: action.domAction,
      },
    ];
  } else if (action.type === "dynamic-child-ancestor") {
    if ("index" in action.domAction) {
      return [{ ...action, domAction: { ...action.domAction, index: absoluteIndex + action.domAction.index } }];
    } else {
      return [action];
    }
  } else if (action.type === "dynamic-modify") {
    return [{ type: "dynamic-modify", index: absoluteIndex + action.index, action: action.action }];
  } else if (action.type === "dynamic-init") {
    return [{ type: "dynamic-init", index: absoluteIndex + action.index, action: action.action }];
  } else if (action.type === "dynamic-child") {
    if (action.domAction.type === "replaceAll") {
      const replaces = range(0, Math.min(memoryItem.length, action.domAction.items.length)).map(
        (childIndex): DynamicChildAction => ({
          type: "dynamic-child",
          domAction: {
            type: "replaceAt",
            index: absoluteIndex + childIndex,
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
                  index: absoluteIndex + childIndex,
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
                  index: absoluteIndex + memoryItem.length,
                  items: action.domAction.items.slice(memoryItem.length),
                },
              },
            ]
          : [];
      return [...replaces, ...deletes, ...inserts];
    } else if (action.domAction.type === "prepend") {
      return [
        { type: "dynamic-child", domAction: { type: "insertAt", index: absoluteIndex, items: action.domAction.items } },
      ];
    } else if (
      action.domAction.type === "deleteAt" ||
      action.domAction.type === "insertAt" ||
      action.domAction.type === "replaceAt"
    ) {
      return [
        { type: "dynamic-child", domAction: { ...action.domAction, index: absoluteIndex + action.domAction.index } },
      ];
    } else if (action.domAction.type === "move") {
      return [
        {
          type: "dynamic-child",
          domAction: {
            type: "move",
            source: absoluteIndex + action.domAction.source,
            destination: absoluteIndex + action.domAction.destination,
          },
        },
      ];
    }
  }
};

const recordChildAction = (action: DynamicAction, permanentId: number, memory: InternalMemory[]): void => {
  const currentEntry = memory.find((im) => im.permanentId === permanentId);
  if (action.type === "dynamic-modify" || action.type === "dynamic-child-ancestor") {
  } else if (action.type === "dynamic-init") {
    currentEntry.length += 1;
  } else if (action.type === "dynamic-child") {
    if (action.domAction.type === "deleteAt") {
      currentEntry.length -= 1;
    } else if (action.domAction.type === "replaceAt") {
      currentEntry.length += action.domAction.items.length - 1;
    } else if (action.domAction.type === "insertAt") {
      currentEntry.length += action.domAction.items.length;
    } else if (action.domAction.type === "move") {
    } else if (action.domAction.type === "prepend") {
      currentEntry.length += action.domAction.items.length;
    } else if (action.domAction.type === "replaceAll") {
      currentEntry.length = action.domAction.items.length;
    }
  }
};

// TODO: out of bounds errors
export const array = (children: r.Observable<DOMAction<RxNode>>): RxDynamicNode => {
  const memory = [] as InternalMemory[];
  let latestPermanentId = 0;

  let waitingForInsert = false;
  const backupQueue: DOMAction<RxNode>[] = [];
  let flushQueue = new r.Subject<DOMAction<RxNode>[]>();
  let childrenFinalized = false;

  return r
    .merge(
      children.pipe(
        r.finalize(() => {
          childrenFinalized = true;
          if (backupQueue.length === 0) {
            flushQueue.complete();
          }
        })
      ),
      flushQueue.pipe(
        r.mergeMap((domActions) =>
          r.of(...domActions).pipe(
            r.finalize(() => {
              if (childrenFinalized && backupQueue.length === 0) {
                flushQueue.complete();
              }
            })
          )
        )
      )
    )
    .pipe(
      r.mergeMap((action): r.Observable<DynamicAction> => {
        if (waitingForInsert) {
          backupQueue.push(action);
          return r.EMPTY;
        }
        if (action.type === "move") {
          const sourceItem = memory.find((im) => im.relativeIndex === action.source);
          const destinationItem = memory.find((im) => im.relativeIndex === action.destination);
          const source = getAbsoluteIndex(sourceItem.permanentId, memory);
          const destination = getAbsoluteIndex(destinationItem.permanentId, memory);
          moveChildren(action.source, action.destination, memory);
          return r.of({
            type: "dynamic-child",
            domAction: { type: "move", source, destination },
          } as DynamicChildAction);
        } else if (action.type === "deleteAt") {
          const elem = memory.find((im) => im.relativeIndex === action.index);
          elem.finish.next();
          elem.finish.complete();
          const index = getAbsoluteIndex(elem.permanentId, memory);
          removeChild(action.index, memory);
          return r.of({
            type: "dynamic-child",
            domAction: {
              type: "deleteAt",
              index,
            },
          } as DynamicChildAction);
        } else if (
          action.type === "insertAt" ||
          action.type === "prepend" ||
          action.type === "replaceAt" ||
          action.type === "replaceAll"
        ) {
          waitingForInsert = true;
          if (action.type === "replaceAt") {
            const elem = memory.find((im) => im.relativeIndex === action.index);
            elem.finish.next();
            elem.finish.complete();
            removeChild(action.index, memory);
          } else if (action.type === "replaceAll") {
            memory.forEach((im) => {
              im.finish.next();
              im.finish.complete();
              removeChild(im.relativeIndex, memory);
            });
          }
          const initialPermanentId = latestPermanentId;
          insertChildren("index" in action ? action.index : 0, action.items.length, memory, latestPermanentId);
          latestPermanentId += action.items.length;
          const asyncStart = createAsyncStart().pipe(r.map(() => "asyncStart"));
          return r
            .merge(
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
              }),
              asyncStart
            )
            .pipe(
              r.tap((childAction) => {
                if (typeof childAction === "string") {
                  waitingForInsert = false;
                  const allQueuedActions = [...backupQueue];
                  backupQueue.splice(0, backupQueue.length);
                  flushQueue.next(allQueuedActions);
                }
              }),
              r.filter((action) => typeof action !== "string")
            );
        }
      }),
      r.finalize(() => {
        if (!flushQueue.closed) {
          flushQueue.complete();
        }
        memory.forEach((im) => im.finish.complete());
      })
    );
};
