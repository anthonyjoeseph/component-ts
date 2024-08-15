import { ArrayEffects } from ".";

export type UniqueSortedArray<A> = readonly A[] & { readonly UniqueSortedArray: unique symbol };

export const empty: UniqueSortedArray<unknown> = [] as unknown as UniqueSortedArray<unknown>;

export const unsafeCoerce = <A>(arr: readonly A[]) => arr as unknown as UniqueSortedArray<A>;

export type UniqueOrdAction<A> =
  | {
      type: "insert";
      items: A[];
    }
  | {
      type: "replaceAll";
      items: A[];
    }
  | {
      type: "delete";
      items: A[];
    };

export type UniqueOrdWarning<A> =
  | {
      type: "insert-duplicates";
      items: A[];
    }
  | {
      type: "delete-not-found";
      items: A[];
    };

export type UniqueOrdEffect<A> = ArrayEffects<A>;
