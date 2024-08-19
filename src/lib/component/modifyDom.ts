import { Observable } from "rxjs";
import { type Component } from "./component";
import { DOMAction } from "../state/array/domAction";

export type ModifyDom = {
  // Node
  appendChild?: Observable<Component>;
  insertBefore?: Observable<{ component: Component; id: string }>;
  removeChild?: Observable<string>;
  replaceChild?: Observable<{ id: string; component: Component }>;

  // Element
  append?: Observable<Component[]>;
  prepend?: Observable<Component[]>;
  before?: Observable<Component[]>;
  after?: Observable<Component[]>;
  replaceWith?: Observable<Component[]>;
  insertAdjacentElement?: Observable<{ position: InsertPosition; component: Component }>;
  remove?: Observable<void>;
  replaceChildren?: Observable<Component[]>;

  // custom
  insertAt?: Observable<{ components: Component[]; index: number }>;
  replaceAt?: Observable<{ components: Component[]; index: number }>;
  removeAt?: Observable<{ index: number }>;
  moveChild?: Observable<{ source: number; destination: number }>;
  insertAdjacentAt?: Observable<{ components: Component[]; index: number }>;
  replaceAdjacentAt?: Observable<{ components: Component[]; index: number }>;
  removeAdjacentAt?: Observable<{ index: number }>;
  moveAdjacent?: Observable<{ source: number; destination: number }>;
  domActionChildren?: Observable<DOMAction<Component>>;
  domActionAdjacent?: Observable<DOMAction<Component>>;
};
export const modifyDomTagNames: string[] = [
  "appendChild",
  "insertBefore",
  "removeChild",
  "replaceChild",
  "append",
  "prepend",
  "before",
  "after",
  "replaceWith",
  "insertAdjacentElement",
  "remove",
  "replaceChildren",
  "insertAt",
  "replaceAt",
  "removeAt",
  "moveChild",
  "insertAdjacentAt",
  "replaceAdjacentAt",
  "removeAdjacentAt",
  "moveAdjacent",
  "domActionChildren",
  "domActionAdjacent",
] satisfies (keyof ModifyDom)[];
