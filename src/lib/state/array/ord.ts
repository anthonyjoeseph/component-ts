import { UniqueSortedArray } from "./uniqueOrd";

export type SortedArray<A> = readonly A[] & { readonly SortedArray: unique symbol };

export const empty: SortedArray<unknown> = [] as unknown as SortedArray<unknown>;

export const fromUniqueSortedArray = <A>(arr: UniqueSortedArray<A>) => arr as unknown as SortedArray<A>;

export const unsafeCoerce = <A>(arr: readonly A[]) => arr as unknown as SortedArray<A>;

/**
 * insert (element)
 * delete (element)
 */
