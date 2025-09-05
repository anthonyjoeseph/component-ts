import { element as e } from "./element";
import { children as c } from "./component";
import { type Observable } from "rxjs";
import * as r from "rxjs";
import { cycle } from "./cycle";
import { ReactNode } from "react";
import { Either } from "fp-ts/Either";
import { omit } from "lodash";

export type FormComponent<E, A> = (input: { error: Observable<E> }) => [ReactNode, { value: () => Either<E, A> }];

declare const formValues: <Components extends Record<string, { value: () => Either<any, any> }>>(
  components: Components
) => Either<
  {
    [K in keyof Components as Components[K] extends never ? never : K]?: {
      error: ReturnType<Components[K]["value"]> extends Either<infer E, infer _> ? E : never;
    };
  },
  {
    [K in keyof Components]: ReturnType<Components[K]["value"]> extends Either<infer _, infer A> ? A : never;
  }
>;

declare const splitObservable: <E extends Record<string, { error: any }>, A>(
  observable: Observable<Either<E, A>>
) => {
  splitErrors: {
    [K in keyof E]-?: {
      error: Observable<NonNullable<E[K]>["error"]>;
    };
  };
  success: Observable<A>;
};

declare const name: FormComponent<never, string>;
declare const newPassword: FormComponent<string, string>;
declare const age: FormComponent<string, number>;

const wholeForm = c(
  () => e("div", []),
  ["name", name],
  ["newPassword", newPassword],
  ["age", age],
  ["submit", () => e("button", ["onClick"])]
);

const doIt = cycle(wholeForm, (events) => {
  const { splitErrors, success } = splitObservable(
    events.submit.onClick().pipe(r.map(() => formValues(omit(events, ["submit"]))))
  );
  return {
    ...splitErrors,
    submit: undefined,
  };
});
