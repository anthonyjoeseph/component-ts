import * as Eq from "fp-ts/Eq";
import * as Ord from "fp-ts/Ord";
import { SafeDOMAction } from "./DOMAction";
import { SortedArray } from "./ord";

export const arrayDiffOrd = <A>(prev: SortedArray<A>, current: SortedArray<A>, ord: Ord.Ord<A>): SafeDOMAction<A>[] => {
  return [];
};

export const arrayDiffEq = <A>(prev: A[], current: A[], eq: Eq.Eq<A> = Eq.eqStrict): SafeDOMAction<A>[] => {
  return [];
};

/**
 *
ORD:
- diff
[1,2,3,6,7,8] -> [1,3,7,8,9]
  - append '9'
  - delete @ 3
  - delete @ 1

- upsert
[1,2,3,6,7,8]  insert 452
  - insert '4','5' @ 3
  - replace ''

- replace
[1,2,3,6,7,8]


EQ:
- diff
[1,2,4,5]->[0,1,3,4,2]
  - append '2'
  - insert '3' @ 2
  - delete @ 1
  - prepend '0'




UNIQUE:
- diff
["one", "two", "four", "five"]->["zero", "one", "three", "four", "two"]
  - move 'two' @ 4
  - insert 'three' @ 1
  - prepend 'zero'


- insert


 */

/**
 * Notes:
https://stackoverflow.com/questions/12514970/is-getelementbyid-efficient
DOM abilities:
- element.replaceChildren = replaceAll
  - replaceChildren w/ no args  = deleteAll
- element.append = append (many)
  - node.appendChild (one)
- element.prepend = prepend (many)
- element.before = insertAt (many)
- element.after = insertAt (many)
- element.replaceWith = replace (should be able to insert many)
- element.insertAdjacentElement = insertAt (one, from child)
- node.insertBefore = (one, from parent)
- node.removeChild = (one)
- node.replaceChild = (one)


Parent's 0 element is first child:
- append = self.append
- prepend = self.prepend
- insertAt = self.children[index].after
- replaceAt = self.children[index].replaceWith
- replaceAll = self.replaceChildren
- deleteAt = self.removeChild (only one)
- move = self.removeChild & self.children[index].after

Relative to siblings - after, never before:
- append = self.parent.append
- prepend = self.parent.prepend
- insertAt = self.parent.children[index + self.index].after
- replaceAt = self.parent.children[index + self.index].replaceWith
- replaceAll = self.replaceChildren
- deleteAt = self.parent.removeChild(index + self.index) (only one)
- move = self.removeChild & self.children[index].after

 */
