import { component as c, RxComponent } from "../lib/component";
import { keyedSiblings as ks, mergeSiblings as ms } from "../lib/siblings";
import * as r from "rxjs";
import * as z from "zod";
import { validateInput, formProgram } from "../lib/form";
import { Observable } from "rxjs";
import { Either } from "fp-ts/Either";
import * as E from "fp-ts/Either";

const zodValidate =
  <A>(schema: z.ZodType<A>) =>
  (input: unknown): Either<string[], A> => {
    const result = schema.safeParse(input);
    if (result.success) {
      return E.right(result.data);
    }
    return E.left(result.error.issues.map((i) => i.message));
  };

const errLabel = (): RxComponent<{ errors: Observable<string[]> }, {}> => {
  const [events, { getNode }] = c("div", ["children"], { style: { color: "red" } });
  return [events, { getNode: ({ errors }) => getNode({ children: errors }), inputKeys: ["errors"] }];
};

const formComponents = ks({
  name: ms(
    validateInput(
      //
      zodValidate(z.string()),
      c("input", [], ["ref"], { type: "text", defaultValue: "ant jofis" })
    ),
    errLabel()
  ),
  newPassword: ms(
    validateInput(
      zodValidate(z.string().min(6).max(10)),
      c("input", [], ["ref"], { type: "password", defaultValue: "admin" })
    ),
    errLabel()
  ),
  age: ms(
    validateInput(
      //
      zodValidate(z.coerce.number()),
      c("input", [], ["ref"], { type: "number", defaultValue: "64" })
    ),
    errLabel()
  ),
});

const [events, { getNode }] = ms(
  formComponents,
  ks({
    submit: c("button", [], ["onClick"], { children: "submit" }),
  })
);

const inputStream = events.submit.onClick.pipe(r.map(() => formComponents[0]));

const { formValues, errors } = formProgram(inputStream, formComponents[1].inputKeys);

formValues
  .pipe(
    r.tap((values) => {
      alert(JSON.stringify(values));
    })
  )
  .subscribe();

export const App = getNode(errors);
