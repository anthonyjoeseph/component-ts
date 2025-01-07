import type { Element, Text, Properties } from "hast";
import type { Observable } from "rxjs";
import type { DOMAction } from "../array/domAction";

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
