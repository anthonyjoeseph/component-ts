import { RxComponent } from "./component";
import { FastAnd } from "./util";

export const child = <ParentInput, ParentEvents, ChildInput, ChildEvents>(
  parent: RxComponent<ParentInput, ParentEvents>,
  child: RxComponent<ChildInput, ChildEvents>
): RxComponent<FastAnd<ParentInput, ChildInput>, FastAnd<ParentEvents, ChildEvents>> => {
  const [parentEvents, { getNode: getParentNode, inputKeys: parentInputKeys }] = parent;
  const [childEvents, { getNode: getChildNode, inputKeys: childInputKeys }] = child;

  const getNode = (input: FastAnd<ParentInput, ChildInput>) => {
    const parentNode = getParentNode(input as ParentInput);
    const childNode = getChildNode(input as ChildInput);
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
    { ...parentEvents, ...childEvents } as FastAnd<ParentEvents, ChildEvents>,
    { getNode, inputKeys: [...parentInputKeys, ...childInputKeys] },
  ];
};
