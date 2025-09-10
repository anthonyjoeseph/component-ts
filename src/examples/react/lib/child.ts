import { RxComponent } from "./component";
import { ShallowAnd } from "./util";

export const child = <
  ParentInput extends Record<string, unknown>,
  ParentEvents extends Record<string, unknown>,
  ChildInput extends Record<string, unknown>,
  ChildEvents extends Record<string, unknown>,
>(
  parent: RxComponent<ParentInput, ParentEvents>,
  child: RxComponent<ChildInput, ChildEvents>
): RxComponent<ShallowAnd<ParentInput, ChildInput>, ShallowAnd<ParentEvents, ChildEvents>> => {
  const [parentEvents, { getNode: getParentNode, inputKeys: parentInputKeys }] = parent;
  const [childEvents, { getNode: getChildNode, inputKeys: childInputKeys }] = child;

  const getNode = (input: ShallowAnd<ParentInput, ChildInput>) => {
    const parentNode = getParentNode(input as unknown as ParentInput);
    const childNode = getChildNode(input as unknown as ChildInput);
    const parentNodeWithChildren =
      parentNode != null && typeof parentNode === "object" && "props" in parentNode
        ? {
            ...parentNode,
            props: {
              ...parentNode.props,
              children:
                typeof childNode === "object"
                  ? {
                      ...childNode,
                      key: "child",
                    }
                  : childNode,
            },
          }
        : parentNode;
    return parentNodeWithChildren;
  };

  return [
    { ...parentEvents, ...childEvents } as ShallowAnd<ParentEvents, ChildEvents>,
    { getNode, inputKeys: [...parentInputKeys, ...childInputKeys] as (keyof ShallowAnd<ParentInput, ChildInput>)[] },
  ];
};
