import * as r from "rxjs";
import * as ro from "rxjs/operators";
import { createElement } from "./lib/component/lib-node";

const buttonEl = createElement("button", { innerText: "value", onclick: "event" });

const divEl = createElement("div", { innerText: "value" });

const scriptEl = createElement("script", { src: "value" });
const htmlEl = createElement("html", {});

const state = new r.BehaviorSubject(0);

export const app = htmlEl({}, [
  divEl({ innerText: { default: "parent element" } }, [
    buttonEl({ innerText: { default: "increase" }, onclick: () => state.next(state.getValue() + 1) }, []),
    divEl({ innerText: { default: "0", latest: state.pipe(ro.map((r) => String(r))) } }),
  ]),
  scriptEl({ src: { default: "index.ts" } }),
]);
