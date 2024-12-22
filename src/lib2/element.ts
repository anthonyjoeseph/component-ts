import type { Element, ElementContent, Text, Comment, Properties } from "hast";
import { h, s } from "hastscript";
import { DOMAction } from "../lib/state/array/domAction";
import type { Observable } from "rxjs";
import * as r from "rxjs";
import { createAsyncStart } from "./util";

type ElementNullableChildren = Omit<Element, "children"> & {
  children: (ElementContent | null)[];
};

export const isDynamic = (a: DynamicAction | StaticAction): a is DynamicAction =>
  a.type === "dynamic-child" || a.type === "dynamic-init" || a.type === "dynamic-modify";

const currentIndex = (slot: number, childIds: number[][]): number =>
  childIds.slice(0, slot).reduce<number>((acc, cur) => acc + cur.length, 0);

const applyActionToNode = (
  a: DynamicInitAction | DynamicModifyAction | DynamicChildAncestorAction | ModifyAction,
  node: ElementNullableChildren
): Element => {
  if (a.type === "modify") {
    return { ...node, properties: { ...node.properties, ...a.property } };
  } else if (a.type === "dynamic-init") {
    // TODO: do something w/ idCallback
    const children = [...node.children];
    children[a.index] = a.action.node;
    return {
      ...node,
      children,
    };
  } else if (a.type === "dynamic-child-ancestor") {
    let children = [...node.children];

    if (a.domAction.type === "prepend") {
      children = [...a.domAction.items, ...node.children];
    } else if (a.domAction.type === "insertAt") {
      children.splice(a.domAction.index, 0, ...a.domAction.items);
    } else if (a.domAction.type === "replaceAt") {
      children.splice(a.domAction.index, 1, ...a.domAction.items);
    } else if (a.domAction.type === "deleteAt") {
      children.splice(a.domAction.index, 1);
    } else if (a.domAction.type === "move") {
      const child = children[a.domAction.source];
      if (a.domAction.destination < a.domAction.source) {
        children.splice(a.domAction.source, 1);
        children.splice(a.domAction.destination, 0, child);
      } else {
        children.splice(a.domAction.source, 1);
        children.splice(a.domAction.destination - 1, 0, child);
      }
    } else {
      children = a.domAction.items;
    }
    return {
      ...node,
      children,
    };
  }
  return node;
};

const addIdAndIndex =
  (parentId: string, slot: number, action: DynamicAction | StaticAction, childIds: number[][]) =>
  (id: number, isAsync: boolean): DynamicInitAction | DynamicModifyAction | DynamicChildAncestorAction => {
    if (action.type === "init") {
      if (isAsync) {
        return {
          type: "dynamic-child-ancestor",
          targetId: parentId,
          domAction: {
            type: childIds[slot].length > 0 ? "replaceAt" : "insertAt",
            index: currentIndex(slot, childIds),
            items: [
              {
                ...action.node,
                properties: { ...action.node.properties, id: `${parentId}-${id}${action.node.properties.id}` },
              },
            ],
          },
        } as DynamicChildAncestorAction;
      }
      return {
        type: "dynamic-init",
        index: currentIndex(slot, childIds),
        action: {
          type: "init",
          node: {
            ...action.node,
            properties: { ...action.node.properties, id: `${parentId}-${id}${action.node.properties.id}` },
          },
          idCallback: action.idCallback,
        },
      };
    } else if (action.type === "dynamic-init") {
      if (isAsync) {
        return {
          type: "dynamic-child-ancestor",
          targetId: parentId,
          domAction: {
            type: childIds[slot].length > 0 ? "replaceAt" : "insertAt",
            index: action.index,
            items: [
              {
                ...action.action.node,
                properties: {
                  ...action.action.node.properties,
                  id: `${parentId}-${id}${action.action.node.properties.id}`,
                },
              },
            ],
          },
        } as DynamicChildAncestorAction;
      }
      return {
        type: "dynamic-init",
        index: currentIndex(slot, childIds) + action.index,
        action: {
          type: "init",
          node: {
            ...action.action.node,
            properties: {
              ...action.action.node.properties,
              id: `${parentId}-${id}${action.action.node.properties.id}`,
            },
          },
          idCallback: action.action.idCallback,
        },
      };
    } else if (action.type === "modify") {
      return {
        type: "dynamic-modify",
        index: currentIndex(slot, childIds),
        action: {
          type: "modify",
          id: `${parentId}-${id}${action.id}`,
          property: action.property,
        },
      };
    } else if (action.type === "dynamic-modify") {
      return {
        type: "dynamic-modify",
        index: currentIndex(slot, childIds) + action.index,
        action: {
          type: "modify",
          id: `${parentId}-${id}${action.action.id}`,
          property: action.action.property,
        },
      };
    } else if (action.type === "child" || action.type === "dynamic-child-ancestor") {
      return {
        type: "dynamic-child-ancestor",
        targetId: `${parentId}-${id}${action.targetId}`,
        domAction:
          "items" in action.domAction
            ? {
                ...action.domAction,
                items: action.domAction.items.map(
                  (i): Element => ({
                    ...i,
                    properties: {
                      ...i.properties,
                      id: `${parentId}-${id}${i.properties.id}`,
                    },
                  })
                ),
              }
            : action.domAction,
      };
    } else {
      const items =
        "items" in action.domAction
          ? action.domAction.items.map(
              (i, itemIndex): Element => ({
                ...i,
                properties: {
                  ...i.properties,
                  id: `${parentId}-${id + itemIndex}${i.properties.id}`,
                },
              })
            )
          : [];
      return {
        type: "dynamic-child-ancestor",
        targetId: parentId,
        domAction:
          action.domAction.type === "insertAt" || action.domAction.type === "replaceAt"
            ? { type: action.domAction.type, index: currentIndex(slot, childIds) + action.domAction.index, items }
            : action.domAction.type === "prepend" || action.domAction.type === "replaceAll"
              ? { type: action.domAction.type, items }
              : action.domAction.type === "move"
                ? {
                    type: "move",
                    source: action.domAction.source + currentIndex(slot, childIds),
                    destination: action.domAction.destination + currentIndex(slot, childIds),
                  }
                : { type: "deleteAt", index: currentIndex(slot, childIds) + action.domAction.index },
      };
    }
  };

const toStaticAction = (action: DynamicModifyAction | DynamicChildAncestorAction): StaticAction =>
  action.type === "dynamic-modify"
    ? action.action
    : {
        type: "child",
        targetId: action.targetId ?? "",
        domAction: action.domAction,
      };

const updateMemory = (
  action: DynamicInitAction | DynamicModifyAction | DynamicChildAncestorAction,
  slot: number,
  childIds: number[][],
  mostRecentId: number
): number => {
  let newMostRecentId = mostRecentId;

  // TODO: index out-of-bounds errors
  if (action.type === "dynamic-init") {
    childIds[slot] = [mostRecentId];
    newMostRecentId++;
  } else if (action.type === "dynamic-child-ancestor") {
    if (action.domAction.type === "move") {
      const id = childIds[slot][action.domAction.source];
      if (action.domAction.destination < action.domAction.source) {
        childIds[slot].splice(action.domAction.source, 1);
        childIds[slot].splice(action.domAction.destination, 0, id);
      } else {
        childIds[slot].splice(action.domAction.source, 1);
        childIds[slot].splice(action.domAction.destination - 1, 0, id);
      }
    } else if (action.domAction.type === "insertAt") {
      childIds[slot].splice(
        action.domAction.index,
        0,
        ...action.domAction.items.map((_, index) => mostRecentId + index)
      );
      newMostRecentId = mostRecentId + action.domAction.items.length;
    } else if (action.domAction.type === "replaceAt") {
      childIds[slot].splice(
        action.domAction.index,
        action.domAction.items.length,
        ...action.domAction.items.map((_, index) => mostRecentId + index)
      );
      newMostRecentId = mostRecentId + action.domAction.items.length;
    } else if (action.domAction.type === "deleteAt") {
      childIds[slot].splice(action.domAction.index, 1);
    } else if (action.domAction.type === "replaceAll") {
      childIds[slot].splice(
        0,
        childIds[slot].length,
        ...action.domAction.items.map((_, index) => mostRecentId + index)
      );
      newMostRecentId = mostRecentId + action.domAction.items.length;
    } else if (action.domAction.type === "prepend") {
      childIds[slot].splice(
        0,
        action.domAction.items.length,
        ...action.domAction.items.map((_, index) => mostRecentId + index)
      );
      newMostRecentId = mostRecentId + action.domAction.items.length;
    }
  }
  return newMostRecentId;
};

export const element = <ElementType extends keyof HTMLElementTagNameMap>(
  selector: ElementType,
  properties: {
    [K in keyof HTMLElementTagNameMap[ElementType] as HTMLElementTagNameMap[ElementType][K] extends (...a: any) => any
      ? never
      : K]?: Observable<HTMLElementTagNameMap[ElementType][K]>;
  },
  children: RxNode[] = [],
  idCallback: IdCallback = () => {}
): RxStaticNode => {
  const asyncStart = createAsyncStart();

  const modifiers = Object.entries(properties)
    .filter(([_, prop]) => !!prop)
    .map(([key, prop]) =>
      (prop as Observable<ValueOf<Properties>>).pipe(
        r.map((val): ModifyAction => ({ type: "modify", id: selector, property: { [key]: val } }))
      )
    );

  let mostRecentId = 0;
  const childIds = new Array<undefined>(children.length).fill(undefined).map((): number[] => []);

  const childrenAsDynamicActions = r.merge(
    ...children.map((c, slot) => c.pipe(r.map((a) => [addIdAndIndex(selector, slot, a, childIds), slot] as const)))
  );

  const initAction = r.merge(...modifiers, childrenAsDynamicActions, asyncStart.pipe(r.map(() => "asyncStart"))).pipe(
    r.scan(
      (acc, cur) => {
        if (typeof cur === "string") return { ...acc, asyncStart: true };
        if (acc.asyncStart) return { ...acc, asyncAction: cur };
        if ("property" in cur) return { ...acc, element: applyActionToNode(cur, acc.element) };
        const [getAction, slot] = cur;
        const actionWithId = getAction(mostRecentId, false);
        const node = applyActionToNode(actionWithId, acc.element);
        mostRecentId = updateMemory(actionWithId, slot, childIds, mostRecentId);
        return { ...acc, element: node };
      },
      {
        element: h(selector, { id: selector }),
        asyncStart: false,
        asyncAction: undefined as
          | ModifyAction
          | readonly [
              (id: number, isAsync: boolean) => DynamicInitAction | DynamicModifyAction | DynamicChildAncestorAction,
              number,
            ]
          | undefined,
      }
    ),
    r.filter(({ asyncStart }) => asyncStart),
    r.map(({ element: node, asyncAction }): StaticAction => {
      if (asyncAction === undefined) return { type: "init", node, idCallback };
      if ("property" in asyncAction) return asyncAction;
      const [getAction, slot] = asyncAction;
      const action = getAction(mostRecentId, true);
      mostRecentId = updateMemory(action, slot, childIds, mostRecentId);
      return toStaticAction(action as DynamicModifyAction | DynamicChildAncestorAction);
    })
  );
  return initAction;
};

export type RxNode = Observable<StaticAction | DynamicAction>;

export type RxStaticNode = Observable<StaticAction>;
export type StaticAction = InitAction | ModifyAction | ChildAction;
export type InitAction = {
  type: "init";
  node: Element;
  idCallback: (id: string) => void;
};
export type ModifyAction = {
  type: "modify";
  id: string;
  property: Properties;
};
export type ChildAction = {
  type: "child";
  targetId: string;
  domAction: DOMAction<Element>;
};

export type RxDynamicNode = Observable<DynamicAction>;
export type DynamicAction = DynamicInitAction | DynamicModifyAction | DynamicChildAction | DynamicChildAncestorAction;
export type DynamicInitAction = {
  type: "dynamic-init";
  index: number;
  action: InitAction;
};
export type DynamicModifyAction = {
  type: "dynamic-modify";
  index: number;
  action: ModifyAction;
};
export type DynamicChildAction = {
  type: "dynamic-child";
  domAction: DOMAction<Element>;
};
export type DynamicChildAncestorAction = {
  type: "dynamic-child-ancestor";
  targetId: string;
  domAction: DOMAction<Element>;
};

export type IdCallback = (id: string) => void;

export type ValueOf<A> = A[keyof A];

/**
 * TODO:
 * - asyncStart as thunk - is this necessary?
 * - take(number of children/props) OR takeUntil(asyncStart), whichever comes first
 * - toHtmlString and hydrate fns
 * - self-delete action
 * - test idCallback
 * - test element's inernal memeory - children create/delete race conditions
 * - id can be customized (somehow) (this should be an option even though it could break uniqueness)
 *   - maybe "internal" id is a property of action objects (?)
 * - id has phantom type of html element
 * - idCallback pushes null when element is deleted
 * - helper fn that collects the ids of a struct of RxElements in a BehaviorSubject
 * - handle observable of text nodes - node.textContent?
 * - "style" property can be string or struct of observables
 *   - other properties that can be structs of observables (?)
 * - errors:
 *   - modify property doesn't exist on tag
 *   - delete element that's not there
 *   - insert/replace/delete/move out of bounds
 *   - non-array action from an array slot, or vice versa
 *     - able to prevent this one with types!
 *  - mdx
 *   - https://github.com/parcel-bundler/parcel/blob/v2/packages/transformers/mdx/src/MDXTransformer.js
 *   - https://github.com/syntax-tree/mdast-util-mdx
 */

/**
 * id = the number of elements added previously - is always static
 * slot = the index within the children - can be static, or dynamic
 * relativeSlot = the slot position where child arrays have no length
 * absoluteSlot = the slot position considering child array length
 */

/**
 * Static Nodes:
 * - store in memory - let mostRecentId: number
 * - store in memory - const childIds =  (number | number[])[]
 *   - array index = relativeSlot
 *   - a single number is a static element, an array is a dynamic element
 *   - when an element is deleted and re-initialized, it gets a new id
 *     - so that calls to the old id will fail
 * - each child is permanently paired with its relativeSlot
 *   - during the `childrenWithId` mapping, childIds[slotNumber]?.[arrayIndex] is used
 * - init:
 *   - childIds[slotNumber][arrayIndex] = ++mostRecentId
 *   - const id = `${selector}-${action.id}${childIds[slotNumber][arrayIndex]}`
 * - modify:
 *   - see above
 * - insert:
 *   - childIds[slotNumber].splice(arrayIndex, 0, ++mostRecentId)
 *   - absoluteSlot is calculated by adding all the `childIds` that exist before its relative index
 * - delete:
 *   - childIds[slotNumber].splice(arrayIndex, 1)
 *   - absoluteSlot is calculated from `childIds`
 */

/**
 * Dynamic Nodes:
 * - store in memory - let mostRecentId: number
 * - store in memory - const children: {id: number; relativeSlot: number; absoluteSlot: number;}[]
 *   - array index = initial id
 *   - initial index = relativeSlot
 *   - each child is permanently paired with its initial id
 *   - adding a child before existing children triggers an increment of all higher relativeSlot & absoluteSlot
 *   - a child array action gets an id & slots like everyone else
 *   - a child array action arrayIndex -> arrayIndex + slot (realSlot)
 *     - this triggers the same increment/decrement of higher absoluteSlots (not relativeSlots)
 *     - these values don't need to be stored in memory, beyond "highestAbsoluteSlot"
 *   - deleted element slots = undefined
 *   -
 * - store in memory - let highestAbsoluteSlot: number
 *   - this is used for out-of-bounds errors
 *   - needed since we don't store child array data
 */

/**
 * what are "ChildActions"?
 * - they are ArrayActions processed thru a static element
 *   - static elements convert every "ArrayAction" they receive into a "ChildAction"
 * - OR they are the result of a redundant async "init" - an "insert" or "delete"
 *
 *
 *
 * export type DynamicAction = { type: "DynamicAction"; index: number; action: Action };
 *
 * export type RxStaticNode = Observable<StaticAction>;
 * export type RXDynamicNode = Observable<DynamicAction>;
 * export type RxNode = Observable<StaticAction> | Observable<DynamicAction>;
 * // NOT Observable<StaticAction | DynamicAction>
 * // that could lead to static actions in dynamic slots, or vice versa
 *
 * const e = (..., children: RxNode[]) => RxStaticNode
 * const a = (actions: Observable<DomAction<RxNode>>) => RxDynamicNode;
 *
 */
