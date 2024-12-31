import type { Element, Text, ElementContent, Properties } from "hast";
import { h, s } from "hastscript";
import { DOMAction } from "../array/domAction";
import type { Observable } from "rxjs";
import * as r from "rxjs";
import { createAsyncStart, range } from "./util";

export const isDynamic = (a: DynamicAction | StaticAction): a is DynamicAction =>
  a.type === "dynamic-child" || a.type === "dynamic-init" || a.type === "dynamic-modify";

const currentIndex = (slot: number, childIds: number[][]): number =>
  childIds.slice(0, slot).reduce<number>((acc, cur) => acc + cur.length, 0);

const withChildIndex = (nodes: (Element | Text)[]): [Element | Text, number][] =>
  nodes.reduce(
    (acc, cur) =>
      cur.type === "text"
        ? [...acc, [cur, -1]]
        : [...acc, [cur, (acc.findLast(([, childIndex]) => childIndex !== -1)?.[1] ?? -1) + 1]],
    [] as [Element | Text, number][]
  );

const applyActionToNode = (
  a: DynamicInitAction | DynamicModifyAction | DynamicChildAncestorAction | ModifyAction,
  initAction: InitAction
): InitAction => {
  const node = initAction.node;
  if (node.type === "text") return initAction;
  if (a.type === "modify") {
    return {
      type: "init",
      node: { ...node, properties: { ...node.properties, ...a.property } },
      idCallbacks: initAction.idCallbacks,
    };
  } else if (a.type === "dynamic-init") {
    const children = [...node.children];
    children.splice(a.index, 0, ...a.nodes);
    return {
      type: "init",
      node: { ...node, children },
      idCallbacks: [...initAction.idCallbacks, ...a.idCallbacks.flat()],
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
      const child = children[a.domAction.source] as ElementContent;
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
      type: "init",
      node: { ...node, children },
      idCallbacks: [...initAction.idCallbacks, ...a.idCallbacks.flat()],
    };
  }
  return initAction;
};

const addIdAndIndex = (
  parentId: string,
  slot: number,
  action: DynamicAction | StaticAction,
  childIds: number[][],
  mostRecentId: number,
  isAsync: boolean
): DynamicInitAction | DynamicModifyAction | DynamicChildAncestorAction => {
  if (action.type === "init") {
    if (action.node.type === "text")
      return {
        type: "dynamic-child-ancestor",
        index: currentIndex(slot, childIds),
        targetId: parentId,
        idCallbacks: [],
        domAction: {
          type: (childIds[slot]?.length ?? 0) > 0 ? "replaceAt" : "insertAt",
          index: 0,
          items: [action.node],
        },
      };
    if (isAsync) {
      return {
        type: "dynamic-child-ancestor",
        index: currentIndex(slot, childIds),
        targetId: parentId,
        idCallbacks: [
          action.idCallbacks.map(({ idCallback, id: childId }) => ({
            id: `${parentId}-${mostRecentId}${childId}`,
            idCallback,
          })),
        ],
        domAction: {
          type: (childIds[slot]?.length ?? 0) > 0 ? "replaceAt" : "insertAt",
          index: 0,
          items: [
            {
              ...action.node,
              properties: {
                ...action.node.properties,
                id: `${parentId}-${mostRecentId}${action.node.properties.id}`,
              },
            },
          ],
        },
      } as DynamicChildAncestorAction;
    }
    return {
      type: "dynamic-init",
      index: currentIndex(slot, childIds),
      idCallbacks: [
        action.idCallbacks.map(({ idCallback, id: childId }) => ({
          id: `${parentId}-${mostRecentId}${childId}`,
          idCallback,
        })),
      ],
      nodes: [
        {
          ...action.node,
          properties: { ...action.node.properties, id: `${parentId}-${mostRecentId}${action.node.properties.id}` },
        },
      ],
    };
  } else if (action.type === "dynamic-init") {
    if (isAsync) {
      return {
        type: "dynamic-child-ancestor",
        index: currentIndex(slot, childIds),
        targetId: parentId,
        idCallbacks: action.idCallbacks.map((itemCallbacks, childIndex) =>
          itemCallbacks.map(({ idCallback, id: childId }) => ({
            id: `${parentId}-${mostRecentId + childIndex}${childId}`,
            idCallback,
          }))
        ),
        domAction: {
          type: "insertAt",
          index: action.index,
          items: withChildIndex(action.nodes).map(([node, childIndex]) =>
            node.type === "text"
              ? node
              : {
                  ...node,
                  properties: {
                    ...node.properties,
                    id: `${parentId}-${mostRecentId + childIndex}${node.properties.id}`,
                  },
                }
          ),
        },
      } as DynamicChildAncestorAction;
    }
    return {
      type: "dynamic-init",
      index: currentIndex(slot, childIds) + action.index,
      idCallbacks: action.idCallbacks.map((itemCallbacks, childIndex) =>
        itemCallbacks.map(({ idCallback, id: childId }) => ({
          id: `${parentId}-${mostRecentId + childIndex}${childId}`,
          idCallback,
        }))
      ),
      nodes: withChildIndex(action.nodes).map(([node, childIndex]) =>
        node.type === "text"
          ? node
          : {
              ...node,
              properties: {
                ...node.properties,
                id: `${parentId}-${mostRecentId + childIndex}${node.properties.id}`,
              },
            }
      ),
    };
  } else if (action.type === "modify") {
    return {
      type: "dynamic-modify",
      index: currentIndex(slot, childIds),
      action: {
        type: "modify",
        id: `${parentId}-${childIds[slot]?.[0]}${action.id}`,
        property: action.property,
      },
    };
  } else if (action.type === "dynamic-modify") {
    return {
      type: "dynamic-modify",
      index: currentIndex(slot, childIds) + action.index,
      action: {
        type: "modify",
        id: `${parentId}-${childIds[slot]?.[action.index]}${action.action.id}`,
        property: action.action.property,
      },
    };
  } else if (action.type === "child" || action.type === "dynamic-child-ancestor") {
    const currentId = childIds[slot]?.["index" in action ? action.index : 0] ?? 0;
    return {
      type: "dynamic-child-ancestor",
      targetId: `${parentId}-${currentId}${action.targetId}`,
      index: currentIndex(slot, childIds),
      idCallbacks:
        action.type === "dynamic-child-ancestor"
          ? action.idCallbacks.map((itemCallbacks, childIndex) =>
              itemCallbacks.map(({ idCallback, id: childId }) => ({
                id: `${parentId}-${currentId + childIndex}${childId}`,
                idCallback,
              }))
            )
          : [
              action.idCallbacks.map(({ idCallback, id: childId }) => ({
                id: `${parentId}-${currentId}${childId}`,
                idCallback,
              })),
            ],
      domAction:
        "items" in action.domAction
          ? {
              ...action.domAction,
              items: withChildIndex(action.domAction.items).map(([i, childIndex]): Element | Text =>
                i.type === "text"
                  ? i
                  : {
                      ...i,
                      properties: {
                        ...i.properties,
                        id: `${parentId}-${currentId + childIndex}${i.properties.id}`,
                      },
                    }
              ),
            }
          : action.domAction,
    };
  } else {
    const items =
      "items" in action.domAction
        ? withChildIndex(action.domAction.items).map(([i, itemIndex]): Element | Text =>
            i.type === "text"
              ? i
              : {
                  ...i,
                  properties: {
                    ...i.properties,
                    id: `${parentId}-${mostRecentId + itemIndex}${i.properties.id}`,
                  },
                }
          )
        : [];
    return {
      type: "dynamic-child-ancestor",
      targetId: parentId,
      index: currentIndex(slot, childIds),
      idCallbacks: action.idCallbacks.map((itemCallbacks, childIndex) =>
        itemCallbacks.map(({ idCallback, id: childId }) => ({
          id: `${parentId}-${mostRecentId + childIndex}${childId}`,
          idCallback,
        }))
      ),
      domAction:
        action.domAction.type === "insertAt" || action.domAction.type === "replaceAt"
          ? {
              type: action.domAction.type,
              index: action.domAction.index,
              items,
            }
          : action.domAction.type === "prepend" || action.domAction.type === "replaceAll"
            ? {
                type: action.domAction.type,
                items,
              }
            : action.domAction.type === "move"
              ? {
                  type: "move",
                  source: action.domAction.source,
                  destination: action.domAction.destination,
                }
              : { type: "deleteAt", index: action.domAction.index },
    };
  }
};

const toStaticAction = (
  action: DynamicModifyAction | DynamicChildAncestorAction,
  affectsOwnChildren: boolean
): StaticAction =>
  action.type === "dynamic-modify"
    ? action.action
    : {
        type: "child",
        targetId: action.targetId ?? "",
        domAction: !affectsOwnChildren
          ? action.domAction
          : "index" in action.domAction
            ? {
                ...action.domAction,
                index: action.domAction.index + action.index,
              }
            : action.domAction.type === "move"
              ? {
                  ...action.domAction,
                  source: action.domAction.source + action.index,
                  destination: action.domAction.destination + action.index,
                }
              : action.domAction,
        idCallbacks: action.idCallbacks.flat(),
      };

const updateMemory = (
  action: StaticAction | DynamicAction,
  slot: number,
  childIds: number[][],
  mostRecentId: number
): number => {
  let newMostRecentId = mostRecentId;

  // TODO: index out-of-bounds errors
  if (action.type === "init") {
    childIds[slot] = [mostRecentId];
    newMostRecentId++;
  } else if (action.type === "dynamic-init") {
    childIds[slot] = [...range(mostRecentId, mostRecentId + action.nodes.length)];
    newMostRecentId += action.nodes.length;
  } else if (action.type === "dynamic-child") {
    if (action.domAction.type === "move") {
      const id = childIds[slot]?.[action.domAction.source] ?? 0;
      if (action.domAction.destination < action.domAction.source) {
        childIds[slot]?.splice(action.domAction.source, 1);
        childIds[slot]?.splice(action.domAction.destination, 0, id);
      } else {
        childIds[slot]?.splice(action.domAction.source, 1);
        childIds[slot]?.splice(action.domAction.destination - 1, 0, id);
      }
    } else if (action.domAction.type === "insertAt") {
      childIds[slot]?.splice(
        action.domAction.index,
        0,
        ...action.domAction.items.map((_, index) => mostRecentId + index)
      );
      newMostRecentId = mostRecentId + action.domAction.items.length;
    } else if (action.domAction.type === "replaceAt") {
      childIds[slot]?.splice(
        action.domAction.index,
        action.domAction.items.length,
        ...action.domAction.items.map((_, index) => mostRecentId + index)
      );
      newMostRecentId = mostRecentId + action.domAction.items.length;
    } else if (action.domAction.type === "deleteAt") {
      childIds[slot]?.splice(action.domAction.index, 1);
    } else if (action.domAction.type === "replaceAll") {
      childIds[slot]?.splice(
        0,
        childIds[slot].length,
        ...action.domAction.items.map((_, index) => mostRecentId + index)
      );
      newMostRecentId = mostRecentId + action.domAction.items.length;
    } else if (action.domAction.type === "prepend") {
      childIds[slot]?.splice(
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
  idCallback?: (id: string | null) => void
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

  const childrenWithSlot = r.merge(...children.map((c, slot) => c.pipe(r.map((a) => [a, slot] as const))));

  const initAction = r.merge(...modifiers, childrenWithSlot, asyncStart.pipe(r.map(() => "asyncStart"))).pipe(
    r.scan(
      (acc, cur) => {
        if (typeof cur === "string") return { ...acc, asyncStart: true };
        if (acc.asyncStart) return { ...acc, asyncAction: cur };
        if ("property" in cur) return { ...acc, initAction: applyActionToNode(cur, acc.initAction) };
        const [action, slot] = cur;
        const dynamicAction = addIdAndIndex(selector, slot, action, childIds, mostRecentId, false);
        const initAction = applyActionToNode(dynamicAction, acc.initAction);
        mostRecentId = updateMemory(action, slot, childIds, mostRecentId);
        return { ...acc, initAction };
      },
      {
        initAction: {
          type: "init",
          node: h(selector, { id: selector }),
          idCallbacks: idCallback ? [{ id: selector, idCallback }] : [],
        } as InitAction,
        asyncStart: false,
        asyncAction: undefined as ModifyAction | readonly [DynamicAction | StaticAction, number] | undefined,
      }
    ),
    r.filter(({ asyncStart }) => asyncStart),
    r.map(({ initAction, asyncAction }): StaticAction => {
      if (asyncAction === undefined) return initAction;
      if ("property" in asyncAction) return asyncAction;
      const [action, slot] = asyncAction;
      const dynamicAction = addIdAndIndex(selector, slot, action, childIds, mostRecentId, true);
      mostRecentId = updateMemory(action, slot, childIds, mostRecentId);
      return toStaticAction(
        dynamicAction as DynamicModifyAction | DynamicChildAncestorAction,
        action.type === "init" || action.type === "dynamic-init" || action.type === "dynamic-child"
      );
    })
  );
  return initAction;
};

export type RxNode = Observable<StaticAction | DynamicAction>;

export type RxStaticNode = Observable<StaticAction>;
export type StaticAction = InitAction | ModifyAction | ChildAction;
export type InitAction = {
  type: "init";
  node: Element | Text;
  idCallbacks: IdCallbacks;
};
export type ModifyAction = {
  type: "modify";
  id: string;
  property: Properties;
};
export type ChildAction = {
  type: "child";
  targetId: string;
  domAction: DOMAction<Element | Text>;
  idCallbacks: IdCallbacks;
};

export type RxDynamicNode = Observable<DynamicAction>;
export type DynamicAction = DynamicInitAction | DynamicModifyAction | DynamicChildAction | DynamicChildAncestorAction;
export type DynamicInitAction = {
  type: "dynamic-init";
  index: number;
  nodes: (Element | Text)[];
  idCallbacks: IdCallbacks[];
};
export type DynamicModifyAction = {
  type: "dynamic-modify";
  index: number;
  action: ModifyAction;
};
export type DynamicChildAction = {
  type: "dynamic-child";
  domAction: DOMAction<Element | Text>;
  idCallbacks: IdCallbacks[];
};
export type DynamicChildAncestorAction = {
  type: "dynamic-child-ancestor";
  index: number;
  targetId: string;
  domAction: DOMAction<Element | Text>;
  idCallbacks: IdCallbacks[];
};

export type IdCallbacks = {
  idCallback: (id: string | null) => void;
  id: string;
}[];

export type ValueOf<A> = A[keyof A];

/**
 * TODO:
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
