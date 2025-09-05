import { type Observable } from "rxjs";
import * as r from "rxjs";
import { element as e } from "./element";
import { cycle, ShallowDefer } from "./cycle";
import { ComponentEvents, ComponentInput } from "./component";

const view = ({ numClicks }: { numClicks: Observable<number> }) => e("button", ["onClick"], { children: numClicks });

const model = (output: ShallowDefer<ComponentEvents<typeof view>>): ComponentInput<typeof view> => ({
  numClicks: output.onClick().pipe(
    r.startWith(0),
    r.scan((acc) => acc + 1, -1)
  ),
});

const [appNode] = cycle(view, model);

export const App = appNode;
