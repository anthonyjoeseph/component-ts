import { ArrayEffects } from ".";

export type UniqueArray<A> = readonly A[] & { readonly UniqueArray: unique symbol };

export const empty: UniqueArray<unknown> = [] as unknown as UniqueArray<unknown>;

export const unsafeCoerce = <A>(arr: readonly A[]) => arr as unknown as UniqueArray<A>;

export type UniqueEqAction<A> =
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
    }
  | {
      type: "deleteAt";
      index: number;
      count: number;
    };

export type UniqueEqWarning<A> =
  | {
      type: "insert-not-found";
      side: "before" | "after";
      item: A;
      newItems: A[];
    }
  | {
      type: "insert-duplicates";
      side: "before" | "after";
      item: A;
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

export type UniqueEqEffect<A> = ArrayEffects<A>;
