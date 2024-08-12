import { Observable, type Subscription } from "rxjs";
import { groupBy, sortBy } from "lodash";

export type SubscribeElement = {
  elementType: keyof HTMLElementTagNameMap;
  tagEventCallbacks: Record<string, (...args: unknown[]) => void>;
  tagValues: Record<string, { default: unknown; latest?: Observable<unknown> }>;
  children: SubscribeElement[];
  idCallback: (id: string) => void;
};

export const createElement =
  <
    ElementType extends keyof HTMLElementTagNameMap,
    Element extends HTMLElementTagNameMap[ElementType],
    Tags extends Partial<Record<keyof Element, "event" | "value">>
  >(
    elementType: ElementType,
    tagTypes: Tags
  ) =>
  (
    tagValues: {
      [K in keyof Tags]: K extends keyof Element
        ? Tags[K] extends "event"
          ? Element[K]
          : { default: Element[K]; latest?: Observable<Element[K]> }
        : never;
    },
    children: SubscribeElement[] = [],
    idCallback: (id: string) => void = () => {}
  ): SubscribeElement => {
    const castTagTypes = tagTypes as Record<string, "event" | "value">;
    const castTagValues = tagValues as Record<
      string,
      { default: unknown; latest?: Observable<unknown> } | ((...args: unknown[]) => void)
    >;
    return {
      elementType,
      tagEventCallbacks: Object.fromEntries(
        Object.entries(castTagTypes)
          .filter(([, type]) => type === "event")
          .map(([tag]) => [tag, castTagValues[tag] as (...args: unknown[]) => void])
      ),
      tagValues: Object.fromEntries(
        Object.entries(castTagTypes)
          .filter(([, type]) => type === "value")
          .map(([tag]) => [tag, castTagValues[tag] as { default: unknown; latest?: Observable<unknown> }])
      ),
      children,
      idCallback,
    };
  };

const mapRecord = <A, B>(r: Record<string, A>, fn: (a: A) => B): Record<string, B> =>
  Object.fromEntries(Object.entries(r).map(([type, val]) => [type, fn(val)]));

const parts = ({
  elementType,
  tagValues,
}: {
  elementType: string;
  tagValues: Record<string, string>;
}): {
  open: string;
  close: string;
  inner: string | undefined;
} => ({
  close: `</${elementType}>`,
  inner:
    "innerHtml" in tagValues ? tagValues["innerHtml"] : "innerText" in tagValues ? tagValues["innerText"] : undefined,
  open: `<${[
    elementType,
    ...Object.entries(tagValues)
      .filter(([tagName]) => tagName !== "innerHtml" && tagName !== "innerText")
      .map(([tagName, value]) => `${tagName}="${value}"`),
  ].join(" ")}>`,
});

export const pairChildrenWithId = (
  children: SubscribeElement[],
  parentId: string
): { element: SubscribeElement; id: string }[] => {
  const childrenByElementType = groupBy(
    children.map((element, originalIndex) => ({ originalIndex, element })),
    ({ element }) => element.elementType
  );
  const childrenWithIdIndex = mapRecord(childrenByElementType, (allOfElement) =>
    allOfElement.map((element, indexWithinElement) => ({
      ...element,
      indexWithinElement,
    }))
  );
  const childrenWithIdIndexOriginalOrder = sortBy(
    Object.values(childrenWithIdIndex).flat(),
    (element) => element.originalIndex
  );

  return childrenWithIdIndexOriginalOrder.map(({ element, indexWithinElement }) => ({
    element,
    id: `${parentId}-${element.elementType}${indexWithinElement === 0 ? "" : indexWithinElement}`,
  }));
};

export const renderToString = ({ elementType, tagValues, children }: SubscribeElement, givenId?: string): string => {
  const id = givenId ?? elementType;
  const { open, close, inner } = parts({
    elementType,
    tagValues: { ...mapRecord(tagValues, (val) => val.default as string), id },
  });
  const childrenWithId = pairChildrenWithId(children, id);

  return `${open}${inner ?? ""}${childrenWithId
    .map(({ element, id }) => renderToString(element, id))
    .join("")}${close}`;
};

export type ArrayAction =
  | {
      type: "insert";
      index: number;
      element: SubscribeElement;
    }
  | {
      type: "replace";
      index: number;
      element: SubscribeElement;
    }
  | {
      type: "append";
      element: SubscribeElement;
    }
  | {
      type: "prepend";
      element: SubscribeElement;
    }
  | {
      type: "delete";
      index: number;
    };
export const array = (actions: Observable<ArrayAction>): SubscribeElement => ({
  children: [],
  elementType: "a",
  tagEventCallbacks: {},
  tagValues: {},
  idCallback: () => {},
});
