cursor semantics:

- how it actually works

  - modification comes in
  - modification is split into leaves
    - this logic needs to live here, not in the leaves
    - should be part of Eq somehow
  - each leaf notification is emitted

- new eq interface:

  - (old, new) => cursor[]
    - outputs array of changes
    - should be composable, logic should rely on other eqs

- listening for a cursor

  - if it's beneath me in the tree
    - dumbly emit
    - no need to check for changes - this has been taken care of

- want to combine cursors somehow

- want for cursors to respond to refined state types

  - is it possible to use cursors to build refined state types?

- uses for cursors:

  - modifying values
    - does not need an eq
  - which changes to emit
    - needs an eq
  - specifying where an eq lives
    - needs an eq

- can add state with a "get" fn
  - aka used for input function
  - these values cannot be modified
  - these values cannot be listened to
  - does this make any sense? Not really
