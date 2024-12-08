import type { Element, Text, Comment, Properties } from "hast";
import { h, s } from "hastscript";
import { DOMAction } from "../lib/state/array/domAction";
import type { Observable } from "rxjs";
import * as r from "rxjs";
import { createAsyncStart } from "./util";

export const isDynamic = (a: DynamicAction | StaticAction): a is DynamicAction =>
  a.type === "dynamic-child" || a.type === "dynamic-init" || a.type === "dynamic-modify";

const addIdAndIndexStatic = <A extends StaticAction>(parentId: string, id: number, action: A): A =>
  action.type === "init"
    ? ({
        type: "init",
        node: {
          ...action.node,
          properties: {
            ...action.node.properties,
            id: `${parentId}-${id}${action.node.properties.id}`,
          },
        },
        idCallback: action.idCallback,
      } as InitAction as A)
    : action.type === "modify"
      ? ({
          type: "modify",
          id: `${parentId}-${id}${action.id}`,
          property: action.property,
        } as A)
      : ({
          type: "child",
          targetId: `${parentId}-${id}${action.targetId}`,
          domAction: action.domAction,
        } as A);

const addIdAndIndex = (
  parentId: string,
  slot: number,
  action: DynamicAction | StaticAction,
  childIds: (number | number[])[]
): StaticAction => {
  if (isDynamic(action)) {
    if (action.type === "dynamic-child") {
      const index = "index" in action.domAction ? slot + action.domAction.index : 0;
      const items =
        "items" in action.domAction
          ? action.domAction.items.map(
              (i): Element => ({
                ...i,
                properties: {
                  ...i.properties,
                  id: `${parentId}-${slot + index}${i.properties.id}`,
                },
              })
            )
          : [];
      return {
        type: "child",
        targetId: parentId,
        domAction:
          action.domAction.type === "insertAt" || action.domAction.type === "replaceAt"
            ? { type: action.domAction.type, index, items }
            : action.domAction.type === "prepend" || action.domAction.type === "replaceAll"
              ? { type: action.domAction.type, items }
              : action.domAction.type === "move"
                ? {
                    type: "move",
                    source: action.domAction.source + slot,
                    destination: action.domAction.destination + slot,
                  }
                : { type: "deleteAt", index },
      };
    }
    return addIdAndIndexStatic(parentId, (childIds[slot] as number[])[action.index] as number, action.action);
  }
  return addIdAndIndexStatic(parentId, childIds[slot] as number, action);
};

const currentIndex = (slot: number, childIds: (number | number[])[]): number =>
  childIds.slice(0, slot).reduce<number>((acc, cur) => acc + (Array.isArray(cur) ? cur.length : cur === -1 ? 0 : 1), 0);

export const e = <ElementType extends keyof HTMLElementTagNameMap>(
  selector: ElementType,
  properties: {
    [K in keyof HTMLElementTagNameMap[ElementType] as HTMLElementTagNameMap[ElementType][K] extends (...a: any) => any
      ? never
      : K]?: Observable<HTMLElementTagNameMap[ElementType][K]>;
  },
  children?: RxNode[],
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

  const mergedProperties = r.merge(...modifiers);
  const asyncProperties = mergedProperties.pipe(r.skipUntil(asyncStart));
  const initProperties = mergedProperties.pipe(
    r.takeUntil(asyncStart),
    r.map((action) => action.property),
    r.toArray(),
    r.map((props): Properties => {
      return props.reduce((acc, cur) => ({ ...acc, ...cur }), {});
    })
  );

  if (!children || children.length === 0)
    return r.merge(
      r.from(
        initProperties.pipe(
          r.map((props) => {
            const node = h(selector, { ...props, id: selector });
            return { type: "init", node, idCallback } as InitAction;
          })
        )
      ),
      asyncProperties
    );

  const childIds = new Array<number | number[]>(children.length).fill(-1);
  let mostRecentId = 0;

  const storedChildren = (children as Observable<StaticAction | DynamicAction>[]).map((c, slot) =>
    c.pipe(
      r.tap((action) => {
        if (action.type === "init") {
          childIds[slot] = mostRecentId++;
        } else if (isDynamic(action)) {
          if (!childIds[slot] || !Array.isArray(childIds[slot])) {
            childIds[slot] = [];
          }
          const arrayChildIds = childIds[slot];
          // TODO: index out-of-bounds errors
          if (action.type === "dynamic-init") {
            arrayChildIds.splice(action.index, 0, mostRecentId++);
          } else if (action.type === "dynamic-child") {
            if (action.domAction.type === "move") {
              const id = arrayChildIds[action.domAction.source];
              if (action.domAction.destination < action.domAction.source) {
                arrayChildIds.splice(action.domAction.source, 1);
                arrayChildIds.splice(action.domAction.destination, 0, id);
              } else {
                arrayChildIds.splice(action.domAction.source, 1);
                arrayChildIds.splice(action.domAction.destination - 1, 0, id);
              }
            } else if (action.domAction.type === "insertAt") {
              arrayChildIds.splice(
                action.domAction.index,
                0,
                ...action.domAction.items.map((_, index) => mostRecentId + index)
              );
              mostRecentId += action.domAction.items.length;
            } else if (action.domAction.type === "replaceAt") {
              arrayChildIds.splice(
                action.domAction.index,
                action.domAction.items.length,
                ...action.domAction.items.map((_, index) => mostRecentId + index)
              );
              mostRecentId += action.domAction.items.length;
            } else if (action.domAction.type === "deleteAt") {
              arrayChildIds.splice(action.domAction.index, 1);
            } else if (action.domAction.type === "replaceAll") {
              arrayChildIds.splice(
                0,
                arrayChildIds.length,
                ...action.domAction.items.map((_, index) => mostRecentId + index)
              );
              mostRecentId += action.domAction.items.length;
            } else if (action.domAction.type === "prepend") {
              arrayChildIds.splice(
                0,
                action.domAction.items.length,
                ...action.domAction.items.map((_, index) => mostRecentId + index)
              );
              mostRecentId += action.domAction.items.length;
            }
          }
        }
        // incoming "child" actions only act on indirect descendants
        // incoming "modify" actions won't affect child ids
      })
    )
  );

  const childrenWithSlot = r.merge(...storedChildren.map((c, index) => c.pipe(r.map((a) => [a, index] as const))));

  const childrenWithId = childrenWithSlot.pipe(
    r.map(([action, slot]): [StaticAction, number] => [addIdAndIndex(selector, slot, action, childIds), slot])
  );

  const arrayActions = childrenWithId.pipe(
    r.filter(([m]) => m.type === "child"),
    r.map(([a]) => a)
  );

  const initChildren = r
    .merge(
      ...storedChildren.map((c, slot) =>
        c.pipe(
          r.filter((v): v is InitAction => v.type === "init"),
          r.map((action): [Element, IdCallback, number] => [
            addIdAndIndexStatic(selector, childIds[slot] as number, action).node,
            action.idCallback,
            slot,
          ]),
          r.takeUntil(asyncStart),
          r.last(undefined, "none") // need a default value - will crash if empty
        )
      )
    )
    .pipe(
      r.filter((a) => typeof a !== "string"),
      r.toArray(),
      r.map((elementsWithIndicies) =>
        elementsWithIndicies.sort(([, , a], [, , b]) => a - b).map(([e, idc]): [Element, IdCallback] => [e, idc])
      )
    );

  const init = r.forkJoin([initProperties, initChildren]).pipe(
    r.map(([properties, children]): InitAction => {
      return {
        type: "init",
        node: h(
          selector,
          { id: selector, ...properties },
          children.map(([e]) => e)
        ),
        idCallback: (id) => {
          idCallback(id);
          children.forEach(([node, childCallback], index) => {
            if (node.type === "element") childCallback(`${id}-${node.properties.id}${index}`);
          });
        },
      };
    })
  );

  const addChildren = childrenWithId.pipe(
    r.filter((v): v is [InitAction, number] => v[0].type === "init"),
    r.skipUntil(asyncStart),
    r.mergeMap(([m, index]) => {
      if (childIds[index]) {
        return r.of(
          {
            type: "child",
            targetId: selector,
            domAction: { type: "deleteAt", index: currentIndex(index, childIds) },
          } as ChildAction,
          {
            type: "child",
            targetId: selector,
            domAction: { type: "insertAt", index: currentIndex(index, childIds), items: [m.node] },
          } as ChildAction
        );
      }
      return r.of({
        type: "child",
        targetId: selector,
        domAction: { type: "insertAt", index: currentIndex(index, childIds), items: [m.node] },
      } as ChildAction);
    })
  );

  return r.merge(init, asyncProperties, arrayActions, addChildren);
};

export type RxNode = RxStaticNode | RxDynamicNode;

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
export type DynamicAction = DynamicInitAction | DynamicModifyAction | DynamicChildAction;
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
