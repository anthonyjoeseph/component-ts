import { Observable } from "rxjs";
import { groupBy, sortBy } from "lodash";
import { Behavior } from "../state/behavior";
import { modifyDomTagNames, type ModifyDom } from "./modifyDom";

export type Component = {
  elementType: keyof HTMLElementTagNameMap;
  tagEventCallbacks: Record<string, (...args: unknown[]) => void>;
  tagValues: Record<string, { default: unknown; latest?: Observable<unknown> }>;
  modifyDom: ModifyDom;
  children: Component[];
  idCallback: (id: string) => void;
  modifyDomErrorCallback: (error: string) => void;
};

export type ElementTags<ElementType extends keyof HTMLElementTagNameMap> = {
  [K in keyof HTMLElementTagNameMap[ElementType]]?: K extends keyof ModifyDom
    ? ModifyDom[K]
    : HTMLElementTagNameMap[ElementType][K] extends ((...args: any) => unknown) | null
      ? NonNullable<HTMLElementTagNameMap[ElementType][K]>
      : { default: HTMLElementTagNameMap[ElementType][K]; latest?: Observable<HTMLElementTagNameMap[ElementType][K]> };
} & {
  [K in keyof ModifyDom]?: ModifyDom[K];
} & {
  getId?: (id: string | undefined) => void;
  modifyDomError?: (error: string) => void;
};

export const component = <ElementType extends keyof HTMLElementTagNameMap>(
  elementType: ElementType,
  tags: ElementTags<ElementType>,
  children: Component[] = []
): Component => {
  const castTags = tags as Record<string, Behavior<unknown> | ((...args: unknown[]) => void)>;
  return {
    elementType,
    tagEventCallbacks: Object.fromEntries(
      Object.entries(castTags)
        .filter(([name, value]) => typeof value === "function" && name !== "getId" && !modifyDomTagNames.includes(name))
        .map(([tag, value]) => [tag, value as (...args: unknown[]) => void])
    ),
    tagValues: Object.fromEntries(
      Object.entries(castTags)
        .filter(([name, value]) => typeof value !== "function" && !modifyDomTagNames.includes(name))
        .map(([tag, value]) => [tag, value as Behavior<unknown>])
    ),
    modifyDom: Object.fromEntries(
      Object.entries(castTags)
        .filter(([name]) => modifyDomTagNames.includes(name))
        .map(([tag, value]) => [tag, value])
    ) as ModifyDom,
    children,
    idCallback:
      (Object.entries(castTags).find(([name]) => name === "getId")?.[1] as (id: string) => void) ?? (() => {}),
    modifyDomErrorCallback:
      (Object.entries(castTags).find(([name]) => name === "modifyDomError")?.[1] as (id: string) => void) ?? (() => {}),
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
