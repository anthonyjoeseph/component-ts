# component-ts

Minimal frontend framework.

1. Pub/sub on element tags via rxjs
1. Auto-generated deterministic element `id`
1. That's about it!

## button increment

```ts
// app.ts
import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { component as c } from "./lib/component/component";

const state = new r.BehaviorSubject<number>(0);

export const app = c("html", {}, [
  c("div", {}, [
    c("button", { innerText: { default: "increment" }, onclick: () => state.next(state.getValue() + 1) }),
    c("div", {
      innerText: { default: state.getValue(), latest: state.pipe(ro.map(String)) },
    }),
  ]),
  c("script", { src: { default: "./index.ts" } }),
]);
```

## render with parcel

Deterministic element `id` for easy static sites, SSG, and SSR

```ts
// index-node.ts
import { app } from "./app";
import { renderToString } from "./lib/component/component";
import fs from "fs/promises";

(async () => {
  const existingHtml = await fs.readFile("./src/index.html", { encoding: "utf-8" }).catch(() => "");
  const newHtml = renderToString(app);
  if (existingHtml !== newHtml) {
    console.log("writing file");
    await fs.writeFile("./src/index.html", newHtml);
  } else {
    console.log("no changes");
  }
})();
```

```ts
// index.ts
import { app } from "./app";
import { hydrate } from "./lib/component/dom/hydrate";

hydrate(app).subscribe(console.log);
```

```bash
npm run nodemon src/index-node.ts
npm run parcel src/index.html
```

## add elements

```ts
import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { component as c } from "./lib/component/component";

export const app = c("html", {}, [
  c("div", {
    prepend: r.interval(1000).pipe(ro.map((tick) => c("div", { innerText: { default: String(tick) } }))),
  }),
  c("script", { src: { default: "./index.ts" } }),
]);
```

## arrays

```ts
import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { component as c } from "./lib/component/component";
import { applyNext } from "./lib/state/behavior";
import { arrayDiffEq } from "./lib/state/array/diff";
import { mapDomAction } from "./lib/state/array/domAction";
import { Eq as numEq } from "fp-ts/number";

const arr = new r.BehaviorSubject<number[]>([]);

const inputId = new r.BehaviorSubject<string | undefined>(undefined);
const inputVal = () => {
  const idVal = inputId.getValue();
  if (!idVal) return undefined;
  return (document.getElementById(idVal) as HTMLInputElement | null)?.value;
};

export const app = c("html", {}, [
  c("div", {}, [
    c("input", {
      type: { default: "text" },
      getId: applyNext(inputId),
    }),
    c("button", { innerText: { default: "render" }, onclick: () => arr.next(JSON.parse(inputVal() ?? "[]")) }),
    c("div", {
      domActionChildren: arr.pipe(
        ro.pairwise(),
        ro.mergeMap(([prev, current]) => r.from(arrayDiffEq(prev, current, numEq))),
        ro.map(mapDomAction((num: number) => c("div", { innerText: { default: String(num) } })))
      ),
    }),
  ]),
  c("script", { src: { default: "./index.ts" } }),
]);
```
