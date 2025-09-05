import { range } from "lodash";
import { element as e } from "./lib/element";
import { cycle } from "./lib/cycle";
import { children as c, CycleModel, map } from "./lib/component";
import { clickerView, clickerModel } from "./components/clicker";

const manyClickers = map(clickerView, ({ key }) => String(key));

// TODO: make things work equally nice with ReactNodes & with RxComponents
// 'includingChildren' here is no good
const view = c((includingChildren: unknown) => e("div", [], includingChildren as any), ["clickers", manyClickers]);

const model: CycleModel<typeof view> = (events) => ({
  clickers: range(0, 4).map((i) => clickerModel(i)(events.clickers[i]!)),
});

const [appNode] = cycle(view, model);

export const App = appNode;
