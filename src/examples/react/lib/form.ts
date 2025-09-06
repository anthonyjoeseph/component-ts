import { ComponentEvents, ComponentInput, component as e, inputComponent as ie, RxComponent } from "./component";
import { keyChildren as kc, mergeChildren as mc } from "./children";
import { type Observable } from "rxjs";
import * as r from "rxjs";
import { cycle } from "./cycle";
import { ReactNode } from "react";
import { Either } from "fp-ts/Either";
import * as E from "fp-ts/Either";
import * as R from "fp-ts/Record";
import { pipe } from "fp-ts/function";
import { omit } from "lodash";
import { z } from "zod";
import { FastAnd } from "./util";

export type FormComponent<E, A> = (input: { error: Observable<E> }) => [ReactNode, { ref: () => Either<E, A> }];

export const formComponent = <A, Component extends RxComponent<any, { ref: () => { value?: unknown } }>>(
  schema: z.ZodType<A>,
  component: Component
): RxComponent<
  ComponentInput<Component>,
  FastAnd<{ ref: () => { value: Either<string[], A> } }, ComponentEvents<Component>>
> => {
  return (input) => {
    const [node, events] = component(input);
    return [
      node,
      {
        ...events,
        ref: () => {
          const ref = events.ref();
          const result = schema.safeParse(ref.value);
          if (result.success) {
            return { ...ref, value: E.right(result.data) };
          }
          return { ...ref, value: E.left(result.error.issues.map((i) => i.message)) };
        },
      },
    ] as any;
  };
};

export const getFormValues = <A extends Record<string, { ref: () => { value: unknown } }>>(a: A) => {
  return pipe(
    a,
    R.map((a) => a.ref().value)
  ) as {
    [K in keyof A]: ReturnType<A[K]["ref"]>["value"];
  };
};

export const validateNestedEither = <Components extends Record<string, Either<any, any>>>(
  components: Components
): Either<
  {
    [K in keyof Components as Components[K] extends never ? never : K]?: Components[K] extends Either<infer E, infer _>
      ? E
      : never;
  },
  {
    [K in keyof Components]: Components[K] extends Either<infer _, infer A> ? A : never;
  }
> => {
  const stuff = pipe(components, R.sequence(E.getApplicativeValidation(R.getUnionSemigroup({ concat: (x) => x }))));
  return stuff as any;
};

export const partitionObservable = <E, A>(
  observable: Observable<Either<E, A>>
): {
  left: Observable<E>;
  right: Observable<A>;
} => {
  return {
    left: observable.pipe(
      r.filter((ei) => ei._tag === "Left"),
      r.map((ei) => ei.left)
    ),
    right: observable.pipe(
      r.filter((ei) => ei._tag === "Right"),
      r.map((ei) => ei.right)
    ),
  };
};

export const splitObservable = <A extends Record<string | symbol, unknown>>(
  observable: Observable<A>
): {
  [K in keyof A]-?: Observable<NonNullable<A[K]>>;
} => {
  return new Proxy<{
    [K in keyof A]-?: Observable<NonNullable<A[K]>>;
  }>(
    {} as unknown as {
      [K in keyof A]-?: Observable<NonNullable<A[K]>>;
    },
    {
      get: (_target, property, _receiver) => {
        return observable.pipe(
          r.filter((a) => property in a),
          r.map((a) => a[property])
        );
      },
    }
  );
};

const errLabel = ie("div", { style: { color: "red" } })<"children">;

const name = formComponent(z.string(), mc(e("div"), [e("input", ["ref"], { type: "text" }), errLabel]));
const newPassword = formComponent(
  z.string().min(6).max(10),
  mc(e("div"), [e("input", ["ref"], { type: "password" }), errLabel])
);
const age = formComponent(z.coerce.number(), mc(e("div"), [e("input", ["ref"], { type: "number" }), errLabel]));

const wholeForm = kc(
  e("div"),
  ["name", name],
  ["newPassword", newPassword],
  ["age", age],
  ["submit", e("button", ["onClick"])]
);

const doIt = cycle(wholeForm, (events) => {
  const inputStream = events.submit
    .onClick()
    .pipe(r.map(() => validateNestedEither(getFormValues(omit(events, ["submit"])))));
  const { left, right } = partitionObservable(inputStream);
  const inputs = pipe(
    splitObservable(left),
    R.map((children) => ({ children }))
  );
  return {
    input: {
      ...inputs,
      submit: undefined,
    },
    output: {
      formValues: right,
    },
  };
});
