import * as r from "rxjs";
import * as B from "./lib/state/behavior";

import BS = r.BehaviorSubject;

const individuals = {
  one: new BS<string | undefined>(undefined),
  two: {
    three: new BS<number>(12),
  },
};

const full = B.struct({ one: individuals.one, two: B.struct(individuals.two) });
