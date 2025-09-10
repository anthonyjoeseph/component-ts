import { component as c, RxComponent } from "../lib/component";
import { keyedSiblings as ks, mergeSiblings as ms } from "../lib/siblings";
import { nameComponent as nc } from "../lib/staticName";
import * as r from "rxjs";
import * as R from "fp-ts/Record";
import { formProgram, partitionObservable, splitObservable } from "../lib/form";
import { Observable } from "rxjs";
import { z } from "zod";
import { Either } from "fp-ts/lib/Either";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";

const errLabel = (): RxComponent<{ errors: Observable<string[]> }, {}> => {
  const [events, { getNode }] = c("div", ["children"], { style: { color: "red" } });
  return [events, { getNode: ({ errors }) => getNode({ children: errors }), inputKeys: ["errors"] }];
};

const formComponents = c(
  "form",
  [],
  ["onSubmit"],
  ms(
    nc(
      "name", //
      ms(
        //
        c("input", { type: "text", defaultValue: "ant jofis" }),
        errLabel()
      )
    ),
    nc(
      "newPassword", //
      ms(
        //
        c("input", { type: "password", defaultValue: "admin" }),
        errLabel()
      )
    ),
    nc(
      "age", //
      ms(
        //
        c("input", { type: "number", defaultValue: "64" }),
        errLabel()
      )
    )
  )
);

const [events, { getNode }] = ms(
  formComponents,
  ks({
    submit: c("button", { children: "submit" }),
  })
);

const inputStream = events.onSubmit.pipe(
  r.map((e) => {
    e.preventDefault();
    const data = Object.keys(e?.currentTarget.elements).map(
      (name) => [name, e?.currentTarget.elements.namedItem(name)] as const
    );
    const validated = z
      .object({
        name: z.string(),
        newPassword: z.string().min(6).max(10),
        age: z.coerce.number(),
      })
      .safeParse(data);
    if (validated.success) return E.right(validated.data);

    const errTree = z.treeifyError(validated.error).properties;
    if (!errTree) return E.left(undefined);
    return E.left(
      Object.fromEntries(Object.entries(errTree).map(([key, value]) => [key, value] as const)) as {
        [K in keyof typeof errTree]: NonNullable<(typeof errTree)[K]>["errors"];
      }
    );
  })
);

const { left, right: formValues } = partitionObservable(inputStream);

const inputs = pipe(
  splitObservable(left, formComponents[1].inputKeys),
  R.map((errors) => ({ errors }))
);

formValues
  .pipe(
    r.tap((values) => {
      alert(JSON.stringify(values));
    })
  )
  .subscribe();

export const App = getNode(inputs);
