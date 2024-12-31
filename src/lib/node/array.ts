import * as r from "rxjs";
import { DOMAction } from "../array/domAction";
import {
  RxDynamicNode,
  RxNode,
  DynamicAction,
  DynamicChildAction,
  StaticAction,
  DynamicInitAction,
  IdCallbacks,
} from "./element";
import { Element, Text } from "hast";
import { createAsyncStart, range, sum } from "./util";

type InternalMemory = {
  permanentId: number;
  relativeIndex: number;
  length: number;
  idCallbacks: IdCallbacks;
  finish: r.Subject<void>;
};

const getAbsoluteIndex = (permanentId: number, memory: InternalMemory[]) => {
  const relativeIndex = memory.find((im) => im.permanentId === permanentId)?.relativeIndex ?? 0;
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
    if (entry && entry.relativeIndex >= relativeIndex) {
      entry.relativeIndex += numberOfChildren;
    }
  }
  const newEntries: InternalMemory[] = range(0, numberOfChildren).map((childIndex) => ({
    permanentId: latestPermanentId + childIndex,
    relativeIndex: relativeIndex + childIndex,
    length: 0,
    idCallbacks: [],
    finish: new r.Subject<void>(),
  }));
  memory.splice(relativeIndex, 0, ...newEntries);
};

const removeChild = (relativeIndex: number, memory: InternalMemory[]) => {
  const indexOfChild = memory.findIndex((im) => im.relativeIndex === relativeIndex);
  const currentEntry = memory[indexOfChild];
  for (const memoryIndex of range(0, memory.length)) {
    const entry = memory[memoryIndex];
    if (entry && currentEntry && entry.relativeIndex >= currentEntry.relativeIndex) {
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
      if (
        entry?.relativeIndex &&
        entry.relativeIndex >= destinationRelativeIndex &&
        entry.relativeIndex < sourceRelativeIndex
      ) {
        entry.relativeIndex++;
      }
    }
  } else {
    for (const memoryIndex of range(0, memory.length)) {
      const entry = memory[memoryIndex];
      if (
        entry?.relativeIndex &&
        entry.relativeIndex > sourceRelativeIndex &&
        entry.relativeIndex <= destinationRelativeIndex
      ) {
        entry.relativeIndex--;
      }
    }
  }
  if (sourceElem) sourceElem.relativeIndex = destinationRelativeIndex;
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
    return [{ type: "dynamic-init", index: absoluteIndex, nodes: [action.node], idCallbacks: [action.idCallbacks] }];
  } else if (action.type === "child") {
    return [
      {
        type: "dynamic-child-ancestor",
        index: absoluteIndex,
        targetId: action.targetId,
        idCallbacks: [action.idCallbacks],
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
    return [
      {
        type: "dynamic-init",
        index: absoluteIndex + action.index,
        idCallbacks: action.idCallbacks,
        nodes: action.nodes,
      },
    ];
  } else {
    if (action.domAction.type === "replaceAll") {
      const replaces = range(0, Math.min(memoryItem?.length ?? 0, action.domAction.items.length)).map(
        (childIndex): DynamicChildAction => ({
          type: "dynamic-child",
          idCallbacks: action.idCallbacks,
          domAction: {
            type: "replaceAt",
            index: absoluteIndex + childIndex,
            items: [(action.domAction as { items: Element[] }).items[childIndex] as Element],
          },
        })
      );
      const deletes =
        (memoryItem?.length ?? 0) > action.domAction.items.length
          ? range(action.domAction.items.length, memoryItem?.length ?? 0).map(
              (childIndex): DynamicChildAction => ({
                type: "dynamic-child",
                idCallbacks: action.idCallbacks,
                domAction: {
                  type: "deleteAt",
                  index: absoluteIndex + childIndex,
                },
              })
            )
          : [];
      const inserts: DynamicChildAction[] =
        (memoryItem?.length ?? 0) < action.domAction.items.length
          ? [
              {
                type: "dynamic-child",
                idCallbacks: action.idCallbacks,
                domAction: {
                  type: "insertAt",
                  index: absoluteIndex + (memoryItem?.length ?? 0),
                  items: action.domAction.items.slice(memoryItem?.length),
                },
              },
            ]
          : [];
      return [...replaces, ...deletes, ...inserts];
    } else if (action.domAction.type === "prepend") {
      return [
        {
          type: "dynamic-child",
          idCallbacks: action.idCallbacks,
          domAction: { type: "insertAt", index: absoluteIndex, items: action.domAction.items },
        },
      ];
    } else if (
      action.domAction.type === "deleteAt" ||
      action.domAction.type === "insertAt" ||
      action.domAction.type === "replaceAt"
    ) {
      return [
        {
          type: "dynamic-child",
          idCallbacks: action.idCallbacks,
          domAction: { ...action.domAction, index: absoluteIndex + action.domAction.index },
        },
      ];
    } else {
      return [
        {
          type: "dynamic-child",
          idCallbacks: action.idCallbacks,
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
  } else if (currentEntry && action.type === "dynamic-init") {
    currentEntry.length += action.nodes.length;
    currentEntry.idCallbacks = action.idCallbacks.flat();
  } else if (currentEntry && action.type === "dynamic-child") {
    if (action.domAction.type === "deleteAt") {
      currentEntry.length -= 1;
    } else if (action.domAction.type === "replaceAt") {
      const numItems = action.domAction.items.length;
      currentEntry.length += numItems - 1;
      currentEntry.idCallbacks = action.idCallbacks.flat();
    } else if (action.domAction.type === "insertAt") {
      const numItems = action.domAction.items.length;
      currentEntry.length += numItems;
      currentEntry.idCallbacks = action.idCallbacks.flat();
    } else if (action.domAction.type === "move") {
    } else if (action.domAction.type === "prepend") {
      const numItems = action.domAction.items.length;
      currentEntry.length += numItems;
      currentEntry.idCallbacks = action.idCallbacks.flat();
    } else if (action.domAction.type === "replaceAll") {
      const numItems = action.domAction.items.length;
      currentEntry.length += numItems;
      currentEntry.idCallbacks = action.idCallbacks.flat();
    }
  }
};

type MergedInits = {
  node: Element | Text;
  idCallbacks: IdCallbacks;
} | null;

// TODO: out of bounds errors
const applyInsertActionToInit = (initAction: MergedInits[], newAction: DynamicAction): MergedInits[] => {
  const allInits = [...initAction];

  if (newAction.type === "dynamic-init") {
    const newInits = newAction.idCallbacks.map(
      (idCallbacks, index): MergedInits => ({
        idCallbacks,
        node: newAction.nodes[index] as Element,
      })
    );
    if (newAction.index < allInits.length - 1) {
      allInits.splice(newAction.index, 0, ...newInits);
    } else if (allInits.length <= newAction.index) {
      const nulls = new Array<null>(newAction.index - allInits.length).fill(null);
      allInits.push(...nulls, ...newInits);
    }
  } else if (newAction.type === "dynamic-modify") {
    const currentInit = allInits[newAction.index];
    if (currentInit) {
      currentInit.node =
        currentInit.node.type === "text"
          ? currentInit.node
          : {
              ...currentInit.node,
              properties: { ...currentInit.node.properties, ...newAction.action.property },
            };
    }
  } else if (newAction.type === "dynamic-child-ancestor") {
    // do nothing
  } else if (newAction.type === "dynamic-child") {
    if (newAction.domAction.type === "move") {
      const source = newAction.domAction.source;
      const destination = newAction.domAction.destination;
      const sourceNode = allInits[source];
      if (source < destination) {
        allInits.splice(destination, 0, sourceNode as MergedInits);
        allInits.splice(source, 1);
      } else {
        allInits.splice(newAction.domAction.source, 1);
        allInits.splice(newAction.domAction.destination, 0, sourceNode as MergedInits);
      }
    } else if (newAction.domAction.type === "replaceAll") {
      const items = newAction.domAction.items;
      const newInits = newAction.idCallbacks.map(
        (idCallbacks, index): MergedInits => ({
          idCallbacks,
          node: items[index] as Element,
        })
      );
      allInits.splice(0, allInits.length, ...newInits);
    } else if (newAction.domAction.type === "deleteAt") {
      const deleteIndex = newAction.domAction.index;
      allInits.splice(deleteIndex, 1);
    } else if (newAction.domAction.type === "replaceAt") {
      const items = newAction.domAction.items;
      const newInits = newAction.idCallbacks.map(
        (idCallbacks, index): MergedInits => ({
          idCallbacks,
          node: items[index] as Element,
        })
      );
      const replaceIndex = newAction.domAction.index;
      allInits.splice(replaceIndex, 1, ...newInits);
    } else if (newAction.domAction.type === "insertAt") {
      const items = newAction.domAction.items;
      const newInits = newAction.idCallbacks.map(
        (idCallbacks, index): MergedInits => ({
          idCallbacks,
          node: items[index] as Element,
        })
      );
      const insertIndex = newAction.domAction.index;
      const nulls = new Array<null>(newAction.domAction.index - allInits.length).fill(null);
      allInits.splice(insertIndex, 0, ...nulls, ...newInits);
    } else if (newAction.domAction.type === "prepend") {
      const items = newAction.domAction.items;
      const newInits = newAction.idCallbacks.map(
        (idCallbacks, index): MergedInits => ({
          idCallbacks,
          node: items[index] as Element,
        })
      );
      allInits.splice(0, 0, ...newInits);
    }
  }
  return allInits;
};

// TODO: error if moves/deletes/replaces come first (replaceAll is ok)
const mergeInsertActions = (actions: DynamicAction[]): DynamicInitAction[] => {
  const firstOkValue = actions.findIndex(
    (a) =>
      a.type === "dynamic-init" ||
      (a.type === "dynamic-child-ancestor" &&
        (a.domAction.type === "insertAt" || a.domAction.type === "prepend" || a.domAction.type === "replaceAll"))
  );
  const okValues = actions.slice(firstOkValue);
  const withNulls = okValues.reduce<MergedInits[]>(
    (initAction, curAction) => applyInsertActionToInit(initAction, curAction),
    [] as MergedInits[]
  );
  const contiguousInits = withNulls.reduce<DynamicInitAction[]>((acc, cur, index) => {
    if (cur == null) return acc;
    const mostRecentInit = acc[acc.length - 1];
    if (!mostRecentInit || mostRecentInit.index + mostRecentInit.nodes.length < index) {
      return [
        ...acc,
        {
          type: "dynamic-init",
          index,
          idCallbacks: cur.node.type === "text" ? [] : [cur.idCallbacks],
          nodes: [cur.node],
        },
      ] as DynamicInitAction[];
    }
    return [
      ...acc.slice(0, acc.length - 1),
      {
        type: "dynamic-init",
        index: mostRecentInit.index,
        idCallbacks:
          cur.node.type === "text" ? mostRecentInit.idCallbacks : [...mostRecentInit.idCallbacks, cur.idCallbacks],
        nodes: [...mostRecentInit.nodes, cur.node],
      },
    ] as DynamicInitAction[];
  }, [] as DynamicInitAction[]);
  return contiguousInits;
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
          const source = getAbsoluteIndex(sourceItem?.permanentId as number, memory);
          const destination = getAbsoluteIndex(destinationItem?.permanentId as number, memory);
          moveChildren(action.source, action.destination, memory);
          return r.of({
            type: "dynamic-child",
            domAction: { type: "move", source, destination },
          } as DynamicChildAction);
        } else if (action.type === "deleteAt") {
          const elem = memory.find((im) => im.relativeIndex === action.index);
          elem?.finish.next();
          elem?.finish.complete();
          const index = getAbsoluteIndex(elem?.permanentId as number, memory);
          removeChild(action.index, memory);
          return r.of({
            type: "dynamic-child",
            idCallbacks: elem ? [elem.idCallbacks] : [],
            domAction: {
              type: "deleteAt",
              index,
            },
          } as DynamicChildAction);
        } else {
          waitingForInsert = true;
          const batchedSyncActions: DynamicAction[] = [];
          if (action.type === "replaceAt") {
            const elem = memory.find((im) => im.relativeIndex === action.index);
            elem?.finish.next();
            elem?.finish.complete();
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
                    if (waitingForInsert) {
                      batchedSyncActions.push(...convertedActions);
                      return r.EMPTY;
                    }
                    return r.of(...convertedActions);
                  }),
                  r.takeUntil(memory.find((im) => im.permanentId === permanentId)?.finish ?? r.of())
                );
              }),
              asyncStart
            )
            .pipe(
              r.mergeMap((childAction) => {
                if (typeof childAction === "string") {
                  waitingForInsert = false;

                  const allQueuedActions = [...backupQueue];
                  backupQueue.splice(0, backupQueue.length);

                  const allInsertActions = [...batchedSyncActions];
                  batchedSyncActions.splice(0, batchedSyncActions.length);

                  const mergedInsertActions = mergeInsertActions(allInsertActions);
                  return r.of(...mergedInsertActions).pipe(r.finalize(() => flushQueue.next(allQueuedActions)));
                }
                if (waitingForInsert) return r.EMPTY;
                return r.of(childAction);
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
