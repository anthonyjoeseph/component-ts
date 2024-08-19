import { Component } from "../component";

export const createId = (parentId: string | undefined, elementType: string, children: HTMLCollection) => {
  let highestSiblingNumber = -1;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeName.toLowerCase() === elementType) {
      const siblingNumber = parseInt(child.id.match(/\d+$/)?.[0] ?? "0");
      if (Number.isInteger(siblingNumber) && siblingNumber > highestSiblingNumber) {
        highestSiblingNumber = siblingNumber;
      }
    }
  }
  highestSiblingNumber++;
  if (parentId) {
    return `${parentId}-${elementType}${highestSiblingNumber === 0 ? "" : highestSiblingNumber}`;
  }
  return `${elementType}${highestSiblingNumber === 0 ? "" : highestSiblingNumber}`;
};

export const createElement = (component: Component, givenId?: string): HTMLElement => {
  const element = document.createElement(component.elementType);
  element.id = givenId ?? component.elementType;
  for (const [tagName, { default: defaultVal }] of Object.entries(component.tagValues)) {
    (element as Record<string, unknown>)[tagName] = defaultVal;
  }
  return element;
};
