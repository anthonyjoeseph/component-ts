import { Observable } from "rxjs";
import { type Component } from "../component";
import { type ModifyDom } from "../modifyDom";
import { createElement, createId } from "./element";

const indexOfChildWithId = (parent: HTMLElement, childId: string) => {
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].id === childId) {
      return i;
    }
  }
  return -1;
};

export const modifyDomActions: {
  [K in keyof ModifyDom]-?: (
    val: NonNullable<ModifyDom[K]> extends Observable<infer Val> ? Val : never,
    element: HTMLElement,
    errorCallback: (error: string) => void,
    removeFromObs: (id: string) => void
  ) => { component: Component; id: string }[];
} = {
  after: (components, element, errorCallback, removeFromObs) => {
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    element.after(...newElements);
    return componentsWithId;
  },
  append: (components, element, errorCallback, removeFromObs) => {
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    element.append(...newElements);
    return componentsWithId;
  },
  appendChild: (component, element, errorCallback, removeFromObs) => {
    const newId = createId(element.id, component.elementType, element.children);
    const newElement = createElement(component, newId);
    element.appendChild(newElement);
    return [{ component, id: newId }];
  },
  before: (components, element, errorCallback, removeFromObs) => {
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    element.before(...newElements);
    return componentsWithId;
  },
  insertAdjacentAt: ({ index, components }, element, errorCallback, removeFromObs) => {
    if (!element.parentElement) {
      errorCallback("cannot add adjacent - no parent");
      return [];
    }
    const indexWithinParent = index + indexOfChildWithId(element.parentElement, element.id);
    if (indexWithinParent < 0 || indexWithinParent > element.parentElement.children.length) {
      errorCallback(`cannot add adjacent at index ${index} - index does not exist`);
      return [];
    }
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.parentElement?.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    if (indexWithinParent === 0) {
      element.after(...newElements);
    } else {
      element.parentElement?.children[indexWithinParent - 1].after(...newElements);
    }
    return componentsWithId;
  },
  insertAdjacentElement: ({ position, component }, element, errorCallback, removeFromObs) => {
    const newId = createId(element.id, component.elementType, element.children);
    const newElement = createElement(component, newId);
    element.insertAdjacentElement(position, newElement);
    return [{ component, id: newId }];
  },
  insertAt: ({ components, index }, element, errorCallback, removeFromObs) => {
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    if (index === 0) {
      element.prepend(...newElements);
    } else if (index <= element.children.length) {
      element.children[index - 1].after(...newElements);
    } else {
      errorCallback("index not found");
      return [];
    }
    return componentsWithId;
  },
  remove: (_, element, __, removeFromObs) => {
    element.remove();
    removeFromObs(element.id);
    return [];
  },
  insertBefore: ({ component, id }, element, errorCallback, removeFromObs) => {
    const newId = createId(element.id, component.elementType, element.children);
    const newElement = createElement(component, newId);
    element.insertBefore(newElement, newElement.querySelector(`#${id}`));
    return [{ component, id: newId }];
  },
  moveAdjacent: ({ source, destination }, element, errorCallback, removeFromObs) => {
    if (!element.parentElement) {
      errorCallback("cannot move adjacent - no parent");
      return [];
    }
    const indexWithinParent = indexOfChildWithId(element.parentElement, element.id);
    const sourceWithinParent = source + indexWithinParent;
    const destinationWithinParent = destination + indexWithinParent;
    if (sourceWithinParent < 0 || sourceWithinParent >= element.parentElement.children.length) {
      errorCallback(`cannot move adjacent from index ${sourceWithinParent} - index does not exist`);
      return [];
    }
    if (destinationWithinParent < 0 || destinationWithinParent >= element.parentElement.children.length) {
      errorCallback(`cannot add adjacent to index ${destinationWithinParent} - index does not exist`);
      return [];
    }
    const sourceElement = element.parentElement.children[sourceWithinParent];
    element.parentElement.removeChild(sourceElement);
    if (destinationWithinParent === 0) {
      element.parentElement.prepend(sourceElement);
    } else {
      element.parentElement.children[
        destinationWithinParent - 1 + (sourceWithinParent < destinationWithinParent ? -1 : 0)
      ].after(sourceElement);
    }
    return [];
  },
  moveChild: ({ source, destination }, element, errorCallback, removeFromObs) => {
    if (source >= element.children.length || destination > element.children.length || source < 0 || destination < 0) {
      errorCallback("index not found");
      return [];
    }
    const sourceElement = element.children[source];
    element.removeChild(sourceElement);
    if (destination === 0) {
      element.prepend(sourceElement);
    } else {
      element.children[destination - 1 + (source < destination ? -1 : 0)].after(sourceElement);
    }
    return [];
  },
  prepend: (components, element, errorCallback, removeFromObs) => {
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    element.prepend(...newElements);
    return componentsWithId;
  },
  removeAdjacentAt: ({ index }, element, errorCallback, removeFromObs) => {
    if (!element.parentElement) {
      errorCallback("cannot remove adjacent - no parent");
      return [];
    }
    const indexWithinParent = index + indexOfChildWithId(element.parentElement, element.id);
    if (indexWithinParent < 0 || indexWithinParent >= element.parentElement.children.length) {
      errorCallback(`cannot remove adjacent at index ${index} - index does not exist`);
      return [];
    }
    element.parentElement.removeChild(element.children[indexWithinParent]);
    removeFromObs(element.parentElement.children[indexWithinParent].id);
    return [];
  },
  removeAt: ({ index }, element, errorCallback, removeFromObs) => {
    if (!element.children[index]) {
      errorCallback(`cannot remove child at index ${index} - doesn't exist`);
    } else {
      element.removeChild(element.children[index]);
      removeFromObs(element.children[index].id);
    }
    return [];
  },
  removeChild: (id, element, errorCallback, removeFromObs) => {
    const child = element.querySelector(`#${id}`);
    if (!child) {
      errorCallback(`cannot remove child with id ${id} - doesn't exist`);
    } else {
      element.removeChild(child);
      removeFromObs(child.id);
    }
    return [];
  },
  replaceAdjacentAt: ({ components, index }, element, errorCallback, removeFromObs) => {
    if (!element.parentElement) {
      errorCallback("cannot add adjacent - no parent");
      return [];
    }
    const indexWithinParent = index + indexOfChildWithId(element.parentElement, element.id);
    if (indexWithinParent < 0 || indexWithinParent >= element.parentElement.children.length) {
      errorCallback(`cannot add adjacent at index ${index} - index does not exist`);
      return [];
    }
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    removeFromObs(element.parentElement.children[indexWithinParent].id);
    element.parentElement.children[indexWithinParent].replaceWith(...newElements);
    return componentsWithId;
  },
  replaceAt: ({ components, index }, element, errorCallback, removeFromObs) => {
    if (index < 0 || index >= element.children.length) {
      errorCallback(`cannot replace child at index ${index} - doesn't exist`);
      return [];
    }
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    removeFromObs(element.children[index].id);
    element.children[index].replaceWith(...newElements);
    return componentsWithId;
  },
  replaceChild: ({ component, id: oldId }, element, errorCallback, removeFromObs) => {
    const oldChild = element.querySelector(`#${oldId}`);
    if (!oldChild) {
      errorCallback(`cannot replace child with id ${oldId} - doesn't exist`);
      return [];
    }
    const newId = createId(element.id, component.elementType, element.children);
    const newElement = createElement(component, newId);
    removeFromObs(oldId);
    element.replaceChild(newElement, oldChild);
    return [{ component, id: newId }];
  },
  replaceChildren: (components, element, errorCallback, removeFromObs) => {
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    for (const child of element.children) {
      removeFromObs(child.id);
    }
    element.replaceChildren(...newElements);
    return componentsWithId;
  },
  replaceWith: (components, element, errorCallback, removeFromObs) => {
    const componentsWithId = components.map((component) => ({
      component,
      id: createId(element.id, component.elementType, element.children),
    }));
    const newElements = componentsWithId.map(({ component, id }) => createElement(component, id));
    removeFromObs(element.id);
    element.replaceWith(...newElements);
    return componentsWithId;
  },
  domActionAdjacent: (domAction, element, errorCallback, removeFromObs) => {
    switch (domAction.type) {
      case "deleteAt":
        return modifyDomActions["removeAdjacentAt"]({ index: domAction.index }, element, errorCallback, removeFromObs);
      case "insertAt":
        return modifyDomActions["insertAdjacentAt"](
          { index: domAction.index, components: domAction.items },
          element,
          errorCallback,
          removeFromObs
        );
      case "move":
        return modifyDomActions["moveAdjacent"](
          { source: domAction.source, destination: domAction.destination },
          element,
          errorCallback,
          removeFromObs
        );
      case "prepend":
        return modifyDomActions["insertAdjacentAt"](
          { components: domAction.items, index: 0 },
          element,
          errorCallback,
          removeFromObs
        );
      case "replaceAt":
        return modifyDomActions["replaceAdjacentAt"](
          { components: domAction.items, index: domAction.index },
          element,
          errorCallback,
          removeFromObs
        );
      case "replaceAll":
        return modifyDomActions["replaceWith"](domAction.items, element, errorCallback, removeFromObs);
    }
  },
  domActionChildren: (domAction, element, errorCallback, removeFromObs) => {
    switch (domAction.type) {
      case "deleteAt":
        return modifyDomActions["removeAt"]({ index: domAction.index }, element, errorCallback, removeFromObs);
      case "insertAt":
        return modifyDomActions["insertAt"](
          { index: domAction.index, components: domAction.items },
          element,
          errorCallback,
          removeFromObs
        );
      case "move":
        return modifyDomActions["moveChild"](
          { source: domAction.source, destination: domAction.destination },
          element,
          errorCallback,
          removeFromObs
        );
      case "prepend":
        return modifyDomActions["prepend"](domAction.items, element, errorCallback, removeFromObs);
      case "replaceAt":
        return modifyDomActions["replaceAt"](
          { components: domAction.items, index: domAction.index },
          element,
          errorCallback,
          removeFromObs
        );
      case "replaceAll":
        return modifyDomActions["replaceChildren"](domAction.items, element, errorCallback, removeFromObs);
    }
  },
};
