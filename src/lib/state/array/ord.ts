import { ArrayEffects } from ".";

export type SortedArray<A> = readonly A[] & { readonly SortedArray: unique symbol };

export const empty: SortedArray<unknown> = [] as unknown as SortedArray<unknown>;

export const unsafeCoerce = <A>(arr: readonly A[]) => arr as unknown as SortedArray<A>;

export type OrdAction<A> =
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
      item: A;
      occurrence: number;
    };

export type OrdWarning<A> = {
  type: "delete-not-found";
  items: A[];
};

export type OrdEffect<A> = ArrayEffects<A>;
