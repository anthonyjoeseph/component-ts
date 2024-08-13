import { Observable, type Subscription } from "rxjs";
import { groupBy, sortBy } from "lodash";

export type Component = {
  elementType: keyof HTMLElementTagNameMap;
  tagEventCallbacks: Record<string, (...args: unknown[]) => void>;
  tagValues: Record<string, { default: unknown; latest?: Observable<unknown> }>;
  children: Component[];
  idCallback: (id: string) => void;
};

export type ElementTags<ElementType extends keyof HTMLElementTagNameMap> = {
  [K in keyof HTMLElementTagNameMap[ElementType]]?: HTMLElementTagNameMap[ElementType][K] extends
    | ((...args: any) => unknown)
    | null
    ? NonNullable<HTMLElementTagNameMap[ElementType][K]>
    : { default: HTMLElementTagNameMap[ElementType][K]; latest?: Observable<HTMLElementTagNameMap[ElementType][K]> };
};

export const component = <ElementType extends keyof HTMLElementTagNameMap>(
  elementType: ElementType,
  tags: ElementTags<ElementType>,
  children: Component[] = [],
  idCallback: (id: string) => void = () => {}
): Component => {
  const castTags = tags as Record<
    string,
    { default: unknown; latest?: Observable<unknown> } | ((...args: unknown[]) => void)
  >;
  return {
    elementType,
    tagEventCallbacks: Object.fromEntries(
      Object.entries(castTags)
        .filter(([name, value]) => name.startsWith("on") && typeof value === "function")
        .map(([tag, value]) => [tag, value as (...args: unknown[]) => void])
    ),
    tagValues: Object.fromEntries(
      Object.entries(castTags)
        .filter(([, value]) => typeof value !== "function")
        .map(([tag, value]) => [tag, value as { default: unknown; latest?: Observable<unknown> }])
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

export const pairChildrenWithId = (children: Component[], parentId: string): { element: Component; id: string }[] => {
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

export const renderToString = ({ elementType, tagValues, children }: Component, givenId?: string): string => {
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
