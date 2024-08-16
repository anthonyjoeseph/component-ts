export type UniqueSortedArray<A> = readonly A[] & { readonly UniqueSortedArray: unique symbol };

export const empty: UniqueSortedArray<unknown> = [] as unknown as UniqueSortedArray<unknown>;

export const unsafeCoerce = <A>(arr: readonly A[]) => arr as unknown as UniqueSortedArray<A>;

/**
 * insert (element)
 * delete (element)
 */
