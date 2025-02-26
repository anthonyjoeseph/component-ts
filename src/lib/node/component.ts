import type { Observable } from "rxjs";
import { RxNode } from "./actions";
import { element as e } from "./element";

export type RxComponent<Props, Events> = (p: Props) => [RxNode, Events];

export const buildComponent = <
  External,
  Internal extends Record<string, ((arg: never) => [RxNode, unknown]) | ((arg: never) => RxNode)>,
>(
  get: (e: External) => Internal,
  fn: (
    i: {
      [K in keyof Internal]: RxNode;
    },
    e: External
  ) => RxNode
): ((
  args: External & { [K in keyof Internal]: Parameters<Internal[K]>[0] }
) => [
  RxNode,
  { [K in keyof Internal as ReturnType<Internal[K]> extends RxNode ? never : K]: ReturnType<Internal[K]>[1] },
]) => {
  return (args) => {
    const internals = get(args);
    const applied = Object.fromEntries(
      Object.entries(internals).map(([key, ctor]) => [key, ctor(internals[key] as never)])
    );
    const nodes = Object.fromEntries(
      Object.entries(applied).map(([key, app]) => {
        if (Array.isArray(app)) {
          return [key, app[0]];
        }
        return [key, app];
      })
    );
    const events = Object.fromEntries(
      Object.entries(applied)
        .filter((arg): arg is [string, [RxNode, unknown]] => Array.isArray(arg))
        .map(([key, event]) => [key, event[1]])
    );
    return [fn(nodes as never, args), events as never];
  };
};

declare const button: (args: { label: string }) => [RxNode, { onClick: Observable<void> }];

declare const textField: (args: { placeholder: string }) => [RxNode, { id: Observable<string | null> }];

declare const avatar: (args: { imgSrc: string; name: string }) => RxNode;

const appComponent = buildComponent(
  () => ({ button, textField, avatar }),
  ({ button, textField, avatar }) => e("div", {}, [button, textField, avatar])
);

// might be good to have 'element' syntax that allows for application of argument type params
// e.g. e("a")<'href' | 'className'> = (args: { href: string; className: string }) => RxNode

// also, should support returning an [RxNode, { events }] from within the 2nd arg
