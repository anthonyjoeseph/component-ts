import { RxComponent } from "./component";
import { type Observable } from "rxjs";
import * as r from "rxjs";
import { Either } from "fp-ts/Either";
import * as E from "fp-ts/Either";
import * as R from "fp-ts/Record";
import { identity, pipe } from "fp-ts/function";
import { ShallowAnd } from "./util";

export type FormComponent<A> = RxComponent<{ errors: string[] }, { getValue: () => Either<string[], A> }>;

export const validateInput = <
  E,
  A,
  Input extends Record<string, unknown>,
  Events extends { ref: () => { value?: unknown } },
>(
  validate: (input: unknown) => Either<E, A>,
  [events, getNode]: RxComponent<Input, Events>
): RxComponent<Input, ShallowAnd<Events, { getValue: () => Either<E, A> }>> => {
  return [
    {
      ...events,
      getValue: () => {
        const ref = events.ref();
        return validate(ref.value);
      },
    } as ShallowAnd<Events, { getValue: () => Either<E, A> }>,
    getNode,
  ];
};

export const getFormValues = <A extends Record<string, { getValue: () => unknown }>>(a: A) => {
  return pipe(
    a,
    R.map((a) => a.getValue())
  ) as {
    [K in keyof A]: ReturnType<A[K]["getValue"]>;
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
  observable: Observable<A | undefined>,
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
            r.filter((a): a is A => a !== undefined && key in a),
            r.map((a) => a[key])
          ),
        ] as const
    )
  ) as { [K in keyof A]-?: Observable<NonNullable<A[K]>> };
};

export const formProgram = <FormEvents extends Record<string, { getValue: () => Either<unknown, unknown> }>>(
  formEvents: Observable<FormEvents>,
  errorNames: (keyof FormEvents)[]
): {
  errors: {
    [K in keyof FormEvents]: {
      errors: Observable<ReturnType<FormEvents[K]["getValue"]> extends Either<infer Error, any> ? Error : never>;
    };
  };
  formValues: Observable<{
    [K in keyof FormEvents]: ReturnType<FormEvents[K]["getValue"]> extends Either<any, infer Value> ? Value : never;
  }>;
} => {
  const inputStream = formEvents.pipe(r.map((a) => validateNestedEither(getFormValues(a))));
  const { left, right } = partitionObservable(inputStream);

  const errors = pipe(
    splitObservable(left, errorNames as any[]),
    R.map((errors) => ({ errors }))
  );
  return {
    errors: errors as {
      [K in keyof FormEvents]: {
        errors: Observable<ReturnType<FormEvents[K]["getValue"]> extends Either<infer Error, any> ? Error : never>;
      };
    },
    formValues: right as Observable<{
      [K in keyof FormEvents]: ReturnType<FormEvents[K]["getValue"]> extends Either<any, infer Value> ? Value : never;
    }>,
  };
};
