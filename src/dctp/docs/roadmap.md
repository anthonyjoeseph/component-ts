- simultaneity in our denotation of hot observable equality

  - does a = b even if b is slightly ahead of a? `delay(1)` should break equality
  - research interleaving and its relationship to denotation
    - can we just throw a `seq` into `subscribe` or `newAddHandler`?
    - what are the tradeoffs for this?
    - is it ever possible for another io to emit _between_ these two ios:
    ```
      io1 = return 1
      io2 = return 2
      io3 = io1 >>= \_ -> io2
    ```
  - [unsafeInterleaveST](https://okmij.org/ftp/Haskell/)
    - section: "Breaking referential transparency with unsafeInterleaveST"
  - [in defense of lazy io](http://comonad.com/reader/2015/on-the-unsafety-of-interleaved-io/)
  - [oleg shows lazy io breaks purity](https://mail.haskell.org/pipermail/haskell/2009-March/021065.html)
  - [unsafeInterleaveIO docs](https://hackage.haskell.org/package/base-4.21.0.0/docs/System-IO-Unsafe.html#v:unsafeInterleaveIO)
  - [haskell concurrency model docs](https://hackage.haskell.org/package/base-4.21.0.0/docs/Control-Concurrent.html)

- prove infinite list equality for ones, oneTwo, and alphaLoop

- research what a `scheduler` might mean for an rx in haskell

  - see above
  - a monotonic list scheduler would delay every emission by some constant "d"
    - if d = 3
    - [(a, 0), (b, 1), (c, 2), ...]
    - [(a, 3), (b, 6), (c, 9), ...]

- research fran

  - primarily, figure out - how does the partial ordering on time cause good recursion?
  - get it running in some capacity
    - try it with haskell
    - worst case, get it running on the
  - test that crazy mutually-recursive behavior
  - [the paper](http://conal.net/papers/icfp97/icfp97.pdf)
    - [square u looking thing](https://en.wikipedia.org/wiki/Disjoint_union)
    - [complete partial order/supremum](https://en.wikipedia.org/wiki/Complete_partial_order)

- implement "batchSimultaneous" in typescript

  - only if needed for the proof! see previous bullet point
    - otherwise, postpone until after "agda"
  - add it to haskell

- finish implementing Observable, Hot and Cold classes (whatever this looks like)

  - implement them in monotonicLists & rx
  - does the `switcher` cause a space leak? How to mitigate this?
  - [basic type level programming](https://www.parsonsmatt.org/2017/04/26/basic_type_level_programming_in_haskell.html)
  - [GADTs for dummies](https://wiki.haskell.org/GADTs_for_dummies)
  - [type families in haskell](https://serokell.io/blog/type-families-haskell)

- clean up / finalize proof

  - [category: the essence of composition](https://bartoszmilewski.com/2014/11/04/category-the-essence-of-composition/)
  - [constructivism](<https://en.wikipedia.org/wiki/Constructivism_(philosophy_of_mathematics)>)
  - [learning agda (conal resources)](https://github.com/conal/Collaboration/blob/master/learning-agda.md)
  - [programming language foundations in agda](https://plfa.github.io/)
  - [contextual equivalence in agda](https://plfa.github.io/ContextualEquivalence/)

- include "concatMap" in haskell rx

- agda???????

- finish component-ts

  - re-write `element` and `array` to be simpler & to use simultaneity
  - finish the `setImmediate` stuff
  - write the event handling stuff
  - write the Proxy thing for `delay` of inputs
  - finish `buildComponent` to handle nodes both with events & without

- fix `fp-ts-routing-adt` so that it outputs a template-literal-typed string that can be used in an express router

- implement `react-table` as a tangible-value style function from (arg: { inputs }) => Observable<{ ...outputs }>

- make sure haskell hole fits + lenses can function as record autocomplete

- write a simple http server in haskell

  - [simplest server library](https://cjwebb.com/getting-started-with-haskells-warp/)
  - [look for most robust routing codec parser](https://gist.github.com/tfausak/a8d7f135bf76e64ea6f35d3be692cbeb)

- haskell as a frontend

  - [getting started with ghc js backend](https://adrianomelo.com/posts/getting-started-with-the-ghc-javascript-backend.html)
  - [2023 GHC contributors workshop](https://www.youtube.com/watch?v=LH_COanxSe0&t=5557s)

- make a game in haskell (or js? both?) with some rx version of frp
  - `Behavior<A>` = `Observable<(time: Int) => A>`
  - `Event<A>` = `Observable<Iterable<[time: Int, value: A]>>`
    - `Iterable` so we can represent some kind of infinite list
    - (see implementation in `src/dctp/v2/nestedIterable`)
  - some strange fn to combine these a behavior with a sampler
    - `strange: (b: Behavior<A>, sampler: Observable<Int>) => Observable<A>`
    - where 'sampler' defaults to [`animationFrames`](https://rxjs.dev/api/index/function/animationFrames) in js
    - in the function, we need to do something like `b.pipe(timestamp({ now: performace.now }))`
      - so that we can know exactly _when_ a new behavior is pushed, in continuous time
  - use some form of continuous collision detection
  - game should involve simple 2D physics, with circles colliding with each other
    - since circles are the easiest to detect continuous collisions on
