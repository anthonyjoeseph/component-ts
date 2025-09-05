import type { Observable } from "rxjs";
import { element as e } from "./element";
import { pick, omit } from "lodash";
import { ReactNode } from "react";

export type RxComponent<Input, Events> = (p: Input) => [ReactNode, Events];

export type ComponentInput<C extends RxComponent<any, any>> = Parameters<C>[0];

export type ComponentEvents<C extends RxComponent<any, any>> = ReturnType<C>[1];

export const buildComponent =
  <Context = {}>(...contextKeys: (keyof Context)[]) =>
  <External, Internal extends Record<string, ((arg: never) => [ReactNode, unknown]) | ((arg: never) => ReactNode)>>(
    get: (e: External, c: Context) => Internal,
    fn: (
      i: {
        [K in keyof Internal]: ReactNode;
      },
      e: External,
      c: Context
    ) => ReactNode
  ): ((
    args: Context & External & { [K in keyof Internal]: Omit<Parameters<Internal[K]>[0], keyof Context> }
  ) => [
    ReactNode,
    { [K in keyof Internal as ReturnType<Internal[K]> extends ReactNode ? never : K]: ReturnType<Internal[K]>[1] },
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
          .filter((arg): arg is [string, [ReactNode, unknown]] => Array.isArray(arg))
          .map(([key, event]) => [key, event[1]])
      );
      return [fn(nodes as never, omit(args, contextKeys) as any, pick(args, contextKeys)), events as never];
    };
  };
