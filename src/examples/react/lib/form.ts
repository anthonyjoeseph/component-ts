import { ComponentEvents, ComponentInput, component as e, inputComponent as ie, RxComponent } from "./component";
import { type Observable } from "rxjs";
import * as r from "rxjs";
import { ReactNode } from "react";
import { Either } from "fp-ts/Either";
import * as E from "fp-ts/Either";
import * as R from "fp-ts/Record";
import { identity, pipe } from "fp-ts/function";
import { z } from "zod";
import { ShallowAnd } from "./util";

export type FormComponent<E, A> = (input: { error: Observable<E> }) => [ReactNode, { ref: () => Either<E, A> }];
R.map;

export const formComponent = <
  A,
  Input extends Record<string, unknown>,
  Events extends { ref: () => { value?: unknown } },
>(
  schema: z.ZodType<A>,
  [events, getNode]: RxComponent<Input, Events>
): RxComponent<Input, ShallowAnd<Events, { ref: () => { value: Either<string[], A> } }>> => {
  return [
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
    } as ShallowAnd<Events, { ref: () => { value: Either<string[], A> } }>,
    getNode,
  ];
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
  const stuff = pipe(
    components,
    R.mapWithIndex((key, value) =>
      pipe(
        value,
        E.mapLeft((err) => ({ [key]: err }))
      )
    ),
    R.sequence(E.getApplicativeValidation(R.getUnionSemigroup({ concat: identity })))
  );
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
      r.filter((ei) => {
        return ei._tag === "Left";
      }),
      r.map((ei) => {
        return ei.left;
      })
    ),
    right: observable.pipe(
      r.filter((ei) => ei._tag === "Right"),
      r.map((ei) => ei.right)
    ),
  };
};

export const splitObservable = <A extends Record<string | symbol, unknown>>(
  observable: Observable<A>,
  keys: (keyof A)[]
): {
  [K in keyof A]-?: Observable<NonNullable<A[K]>>;
} => {
  return Object.fromEntries(
    keys.map(
      (key) =>
        [
          key,
          observable.pipe(
            r.filter((a) => key in a),
            r.map((a) => a[key])
          ),
        ] as const
    )
  ) as { [K in keyof A]-?: Observable<NonNullable<A[K]>> };
};
