- correspondence between: fran sampling ~~ rxjs scheduler

  - let's not re-invent the wheel
  - when should sampling happen? And how?

- how can event and behavior be mutually recursive?

  - why is this a requirement in the original spec? Can it be stack safe in js?

- are there leaks in the abstraction of Event<A> => Event<Behavior<B>> ?

  - what about behavior inputs? Like mouse position in the original paper?
    - does that necessarily lead to a space-time leak?
    - what does behavior actually mean in this context?
    - are Behaviors ever invoked for something other than sampling? (peek into future, peek into past?)

- can event and behavior be created as top-level entities rather than being confined to a function?

  - how do we go from observable -> event -> observable?
  - same thing with observable -> behavior -> observable?

- where does "scan" / "accumE" / "accumB" / "integral" belong in all this?

  - feels like IO ... except integral I guess ...

- is this justifiable? What are the advantages to this in an actual frontend setting?
  - besides animation, which is dubious anyway
  - is simultaneity useful in the frontend?
  - do we want Behaviors of dom inserts/deletes? A new node every 5 seconds?
