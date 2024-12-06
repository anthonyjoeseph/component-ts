import type { Element, Properties } from "hast";
import { h } from "hastscript";
import { DOMAction } from "../lib/state/array/domAction";
import type { Observable } from "rxjs";
import * as r from "rxjs";
import { asyncStart } from "./util";

const addIdAndIndex = <A extends Action>(id: string, index: number, action: A): A =>
  action.type === "init"
    ? ({
        type: "init",
        element: {
          ...action.element,
          properties: { ...action.element.properties, id: `${id}-${action.element.properties.id}${index}` },
        },
        idCallback: action.idCallback,
      } as InitAction as A)
    : action.type === "modify"
      ? ({
          type: "modify",
          id: `${id}-${index}${action.id}`,
          property: action.property,
        } as A)
      : ({
          type: "arrayAction",
          targetId: `${id}-${index}${action.targetId}`,
          domAction: action.domAction,
        } as A);

const currentIndex = (initialIndex: number, existingChildren: boolean[]): number =>
  existingChildren.slice(0, initialIndex).filter(Boolean).length;

export const e = <ElementType extends keyof HTMLElementTagNameMap>(
  selector: ElementType,
  properties: {
    [K in keyof HTMLElementTagNameMap[ElementType] as HTMLElementTagNameMap[ElementType][K] extends (...a: any) => any
      ? never
      : K]?: Observable<HTMLElementTagNameMap[ElementType][K]>;
  },
  children?: RxElement[],
  idCallback: IdCallback = () => {}
): RxElement => {
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

  if (!children)
    return r.merge(
      r.from(
        initProperties.pipe(
          r.map((props) => {
            const element = h(selector, { ...props, id: selector });
            return { type: "init", element, idCallback } as InitAction;
          })
        )
      ),
      asyncProperties
    );

  const existingChildren = new Array<boolean>(children.length).fill(false);

  const childrenWithIndex = r.merge(...children.map((c, index) => c.pipe(r.map((a) => [a, index] as const))));

  const childrenWithId = childrenWithIndex.pipe(
    r.map(([action, index]): [Action, number] => [addIdAndIndex(selector, index, action), index])
  );

  const arrayActions = childrenWithId.pipe(
    r.filter(([m]) => m.type === "arrayAction"),
    r.map(([a]) => a)
  );

  const initChildren = r
    .merge(
      ...children.map((c, index) =>
        c.pipe(
          r.filter((v): v is InitAction => v.type === "init"),
          r.map((action): [Element, IdCallback, number] => [
            addIdAndIndex(selector, index, action).element,
            action.idCallback,
            index,
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
        element: h(
          selector,
          { id: selector, ...properties },
          children.map(([e]) => e)
        ),
        idCallback: (id) => {
          idCallback(id);
          children.forEach(([element, childCallback], index) => {
            childCallback(`${id}-${element.properties.id}${index}`);
          });
        },
      };
    })
  );

  const addChildren = childrenWithId.pipe(
    r.filter((v): v is [InitAction, number] => v[0].type === "init"),
    r.skipUntil(asyncStart),
    r.mergeMap(([m, index]) =>
      existingChildren[index]
        ? r.of(
            {
              type: "arrayAction",
              targetId: selector,
              domAction: { type: "deleteAt", index: currentIndex(index, existingChildren) },
            } as ArrayAction,
            {
              type: "arrayAction",
              targetId: selector,
              domAction: { type: "insertAt", index: currentIndex(index, existingChildren), items: [m.element] },
            } as ArrayAction
          )
        : r.of({
            type: "arrayAction",
            targetId: selector,
            domAction: { type: "insertAt", index: currentIndex(index, existingChildren), items: [m.element] },
          } as ArrayAction)
    )
  );

  const internalMemory = childrenWithId.pipe(
    r.filter(([action]) => action.type === "init"),
    r.tap(([, index]) => {
      existingChildren[index] = true;
    }),
    r.mergeMap(() => r.EMPTY)
  );

  return r.merge(init, asyncProperties, arrayActions, addChildren, internalMemory);
};

export type RxElement = Observable<Action>;

export type Action = InitAction | ModifyAction | ArrayAction;
export type InitAction = {
  type: "init";
  element: Element;
  idCallback: (id: string) => void;
};
export type ModifyAction = {
  type: "modify";
  id: string;
  property: Properties;
};
export type ArrayAction = {
  type: "arrayAction";
  targetId: string;
  domAction: DOMAction<Element>;
};

export type IdCallback = (id: string) => void;

export type ValueOf<A> = A[keyof A];

/**
 * TODO:
 * - 'array' element creator fn
 *   - 'insertAdjacsent' array action
 *   -  maybe all inserts should be 'insertAdjascent'?
 * - toHtmlString and hydrate fns
 * - self-delete action
 * - test element's inernal memeory - children create/delete race conditions
 * - id can be customized (somehow) (this should be an option even though it could break uniqueness)
 * - id has phantom type of html element
 * - idCallback pushes null when element is deleted
 * - helper fn that collects the ids of a struct of RxElements in a BehaviorSubject
 */
