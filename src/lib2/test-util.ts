import { DynamicAction, DynamicInitAction, StaticAction } from "./element";

export const scrubIdCallbacks = (actions: (StaticAction | DynamicAction)[]): (StaticAction | DynamicAction)[] =>
  actions.map((action) => {
    if ("idCallbacks" in action) {
      const { idCallbacks: _, ...rest } = action;
      return rest as StaticAction;
    }
    return action;
  });
