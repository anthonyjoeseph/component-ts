import * as r from "rxjs";
import { DOMAction } from "../lib/state/array/domAction";
import {
  RxDynamicNode,
  RxNode,
  DynamicAction,
  DynamicInitAction,
  DynamicModifyAction,
  DynamicChildAction,
  DynamicChildAncestorAction,
  StaticAction,
  InitAction,
  ModifyAction,
  ChildAction,
} from "./element";

type InternalMemory = { permanentId: number; relativeIndex: number; absoluteIndex: number; finish: r.Subject<void> };

const insertChildren = (
  index: number,
  children: RxNode[],
  memory: InternalMemory[],
  latestPermanentId: number
): void => {};

const removeChild = (absoluteIndex: number, memory: InternalMemory[]) => {};

const moveChildren = (sourceAbsoluteIndex: number, destinationAbsoluteIndex: number, memory: InternalMemory[]) => {};

const recordChildAction = (
  action: StaticAction | DynamicAction,
  permanentId: number,
  memory: InternalMemory[]
): void => {};

const convertChildAction = (
  action: StaticAction | DynamicAction,
  permanentId: number,
  memory: InternalMemory[]
): DynamicAction => {};

export const array = (children: r.Observable<DOMAction<RxNode>>): RxDynamicNode => {
  const memory = [] as InternalMemory[];
  let latestPermanentId = 0;
  return children.pipe(
    r.mergeMap((action) => {
      if (action.type === "deleteAt" || action.type === "replaceAt") {
        const finisher = memory.find((im) => im.absoluteIndex === action.index).finish;
        finisher.next();
        finisher.complete();
        removeChild(action.index, memory);
        if (action.type === "deleteAt") return r.EMPTY;
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
          action.items,
          memory,
          latestPermanentId
        );
        return r.merge(
          ...action.items.map((childActions, childIndex) => {
            const permanentId = initialPermanentId + childIndex;
            return childActions.pipe(
              r.map((childAction) => {
                recordChildAction(childAction, permanentId, memory);
                return convertChildAction(childAction, permanentId, memory);
              }),
              r.takeUntil(memory.find((im) => im.permanentId === permanentId).finish)
            );
          })
        );
      } else if (action.type === "move") {
        moveChildren(action.source, action.destination, memory);
        return r.EMPTY;
      }
    })
  );
};
