import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { component as c } from "./lib/component/lib-node";

const state = new r.BehaviorSubject(0);

export const app = c("html", {}, [
  c("div", { innerText: { default: "hello" } }, [
    c("button", { innerText: { default: "increase" }, onclick: () => state.next(state.getValue() + 1) }),
    c("div", { innerText: { default: "0", latest: state.pipe(ro.map((r) => String(r))) } }),
  ]),
  c("script", { src: { default: "./index.ts" } }),
]);
