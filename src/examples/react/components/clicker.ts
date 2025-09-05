import { type Observable } from "rxjs";
import * as r from "rxjs";
import { element as e } from "../lib/element";
import { CycleModel } from "../lib/component";

export const clickerView = ({
  numClicks,
  fontSize,
  key,
}: {
  numClicks: Observable<number>;
  fontSize: number;
  key: number;
}) => e("button", ["onClick"], { style: { fontSize: fontSize }, children: numClicks });

export const clickerModel =
  (key: number): CycleModel<typeof clickerView> =>
  (output) => ({
    key,
    fontSize: 30,
    numClicks: output.onClick().pipe(
      r.startWith(0),
      r.scan((acc) => acc + 1, -1)
    ),
  });
