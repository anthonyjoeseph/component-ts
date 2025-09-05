import type { Observable } from "rxjs";
import { RxNode } from "./actions";
import { element as e } from "./element";
import { pick, omit } from "lodash";

export type RxComponent<Props, Events> = (p: Props) => [RxNode, Events];

export const buildComponent =
  <Context = {}>(...contextKeys: (keyof Context)[]) =>
  <External, Internal extends Record<string, ((arg: never) => [RxNode, unknown]) | ((arg: never) => RxNode)>>(
    get: (e: External, c: Context) => Internal,
    fn: (
      i: {
        [K in keyof Internal]: RxNode;
      },
      e: External,
      c: Context
    ) => RxNode
  ): ((
    args: Context & External & { [K in keyof Internal]: Omit<Parameters<Internal[K]>[0], keyof Context> }
  ) => [
    RxNode,
    { [K in keyof Internal as ReturnType<Internal[K]> extends RxNode ? never : K]: ReturnType<Internal[K]>[1] },
  ]) => {
    return (args) => {
      const internals = get(omit(args, contextKeys) as any, pick(args, contextKeys));
      const applied = Object.fromEntries(
        Object.entries(internals).map(([key, ctor]) => [
          key,
          ctor({ ...pick(args, contextKeys), ...internals[key] } as never),
        ])
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
      return [fn(nodes as never, omit(args, contextKeys) as any, pick(args, contextKeys)), events as never];
    };
  };

declare const button: (args: {
  label: Observable<string>;
  darkMode: Observable<string>;
}) => [RxNode, { onClick: Observable<void> }];

declare const textField: (args: { placeholder: Observable<string> }) => [RxNode, { id: Observable<string | null> }];

declare const avatar: (args: { imgSrc: Observable<string>; name: Observable<string> }) => RxNode;

const buildAppComponent = buildComponent<{ darkMode: Observable<boolean> }>("darkMode");

const appComponent = buildAppComponent(
  () => ({ button, textField, avatar }),
  ({ button, textField, avatar }) => e("div", {}, [button, textField, avatar])
);

// might be good to have 'element' syntax that allows for application of argument type params
// e.g. e("a")<'href' | 'className'> = (args: { href: Observable<string>; className: Observable<string> }) => RxNode

// also, should support returning an [RxNode, { events }] from within the 2nd arg

/**
 * thoughts on dark mode / "context":
 * - we will _have_ to have the argument represented at each level of the tree
 *   - since we don't want any construct more complicated than a "component"
 * - the challenge is to include all of those arguments without boilerplate
 * - technically, all we need is for the "middle" components to do this
 *   - at the "bottom," we will pass it in manually
 *   - at the top, it's only specified once
 * - maybe it's simplest, then, if we have a "context" buildComponent that passes context to _all_ of its children
 *   - if a child is missing this prop, does it need to error out?
 */
