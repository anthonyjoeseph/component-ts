import { ArrayEffects } from ".";

export type EqAction<A> =
  | {
      type: "append";
      items: A[];
    }
  | {
      type: "prepend";
      items: A[];
    }
  | {
      type: "insert";
      side: "before" | "after";
      item: A;
      occurrence: number;
      newItems: A[];
    }
  | {
      type: "insertAt";
      index: number;
      items: A[];
    }
  | {
      type: "replaceAll";
      items: A[];
    }
  | {
      type: "delete";
      item: A;
      occurrence: number;
    }
  | {
      type: "deleteAt";
      index: number;
      count: number;
    };

export type EqWarning<A> =
  | {
      type: "insert-not-found";
      side: "before" | "after";
      item: A;
      occurrence: number;
      newItems: A[];
    }
  | {
      type: "insert-bounds";
      side: "before" | "after";
      item: A;
      occurrence: number;
      newItems: A[];
    }
  | {
      type: "insert-duplicates";
      side: "before" | "after";
      item: A;
      occurrence: number;
      newItems: A[];
    }
  | {
      type: "insertAt-duplicates";
      items: A[];
    }
  | {
      type: "insertAt-bounds";
      items: A[];
    }
  | {
      type: "delete-not-found";
      items: A[];
    }
  | {
      type: "deleteAt-bounds";
      index: number;
      count: number;
    }
  | {
      type: "deleteAt-count-invalid";
      index: number;
      count: number;
    };

export type EqEffect<A> = ArrayEffects<A>;
