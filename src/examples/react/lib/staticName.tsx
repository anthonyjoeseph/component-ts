import { ComponentEvents, ComponentInput, RxComponent } from "./component";
import { HasKeys } from "./util";
import { keyedSiblings } from "./siblings";
import { ReactNode } from "react";

export const keyedPropComponent =
  <Prop extends string>(prop: Prop) =>
  <Name extends string, Component extends RxComponent<any, any>>(
    name: Name,
    component: Component
  ): RxComponent<
    HasKeys<ComponentInput<Component>> extends true
      ? {
          [name in Name]: ComponentInput<Component>;
        }
      : {},
    HasKeys<ComponentEvents<Component>> extends true
      ? {
          [name in Name]: ComponentEvents<Component>;
        }
      : {}
  > => {
    const [events, { getNode, inputKeys }] = keyedSiblings({ [name]: component });

    return [
      events as any,
      {
        getNode: (inputs: any) => {
          const node = getNode(inputs);
          return node != null && typeof node === "object" && "props" in node
            ? ({
                ...node,
                props: {
                  ...node.props,
                  [prop]: name,
                },
              } satisfies ReactNode)
            : node;
        },
        inputKeys,
      },
    ] as any;
  };

export const nameComponent = keyedPropComponent("name");
