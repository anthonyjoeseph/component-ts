# integration/physics

- https://hackage.haskell.org/package/units-defs
  - SI units as types
- http://conal.net/blog/posts/exact-numeric-integration
- https://metavar.blogspot.com/2008/02/higher-order-multivariate-automatic.html
- https://www.youtube.com/watch?v=Shl3MtWGu18&t=1s
- https://www.youtube.com/watch?v=nxaOp76MaDQ
- https://hackage.haskell.org/package/vector-space
  - https://github.com/conal/vector-space?tab=readme-ov-file
  - https://vimeo.com/6622658
- http://conal.net/blog/posts/differentiation-of-higher-order-types
- https://hackage.haskell.org/package/learn-physics
  - https://www.google.com/books/edition/Learn_Physics_with_Functional_Programmin/6ytmEAAAQBAJ?hl=en&gbpv=1&printsec=frontcover
- https://github.com/conal/Fran/blob/master/src/Integral.hs
- https://hackage.haskell.org/package/reactive-0.11.5/docs/src/FRP-Reactive-Behavior.html#integral
- https://www.khanacademy.org/math
  - multivariable calculus (& earlier)
  - differential equations
  - linear algebra - vectors & stuff
- https://www.youtube.com/playlist?list=PLSlpr6o9vURwq3oxVZSimY8iC-cdd3kIs
  - "let's make a physics engine"
- https://hackage.haskell.org/package/linear
- https://www.gamedev.net/forums/topic/424654-calculus-and-collision-detection/3825717/
- https://www.haroldserrano.com/blog/visualizing-the-runge-kutta-method
- https://www.toptal.com/game/video-game-physics-part-ii-collision-detection-for-solid-objects#:~:text=Continuous%20collision%20detection

# js repos

- https://github.com/krausest/js-framework-benchmark
- https://github.com/snabbdom/snabbdom
- https://github.com/funkia/turbine
- https://github.com/cyclejs/cyclejs

# frp repos

- https://github.com/conal/Fran
- https://github.com/conal/unamb/
- https://github.com/raveclassic/frp-ts
- https://github.com/SodiumFRP/sodium-typescript
- https://github.com/SodiumFRP/sodium-typescript
- https://github.com/funkia/hareactive
- https://github.com/turion/rhine
- https://hackage.haskell.org/package/pipes-concurrency-1.0.0/docs/Control-Proxy-Concurrent-Tutorial.html

# papers

- [the denotational semantics of programming languages - stratchey and scott](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=8805dca7369fddcfcfcb5f8ac8a9dcd3fd857930)
- [how to declare an imperative (wadler)](https://ics.uci.edu/~jajones/INF102-S18/readings/24_wadler)
- [Propositions as types (wadler)](https://homepages.inf.ed.ac.uk/wadler/papers/propositions-as-types/propositions-as-types.pdf)
- [FRAN](http://conal.net/papers/icfp97/icfp97.pdf)
- [push-pull frp](http://conal.net/papers/push-pull-frp/push-pull-frp.pdf)
- [data driven frp (draft, referenced by frp-ts) - conal elliot](http://conal.net/papers/data-driven/paper.pdf)
- [Gergeley Patai - Monadic trimming](https://github.com/ocharles/papers/blob/master/Efficient%20and%20Compositional%20Higher-Order%20Streams.pdf)
- [frpnow library](https://github.com/beerendlauwers/haskell-papers-ereader/blob/master/papers/Practical%20Principled%20FRP%20-%20Forget%20the%20past%2C%20change%20the%20future%2C%20FRPNow!.pdf)
- [Reflex haskell library](https://futureofcoding.org/papers/comprehensible-frp/comprehensible-frp.pdf)
- [Jeltch - curry-howard correspondence of FRP](https://www.sciencedirect.com/science/article/pii/S157106611200045X)
- [Linear time logic/FRP](https://www.semanticscholar.org/paper/LTL-types-FRP%3A-linear-time-temporal-logic-as-types%2C-Jeffrey/b201a51586a218c2c32f48d49179f6511df26976)
- [Elm paper](https://elm-lang.org/assets/papers/concurrent-frp.pdf)

# blog posts

- http://conal.net/blog/posts/is-haskell-a-purely-functional-language#comment-35882
  - "I doubt that IO does denote anything, given the requirement of compositionality of semantics. Consider that IO includes exception-handling, which is sensitive to order-of-evaluation of pure (non-IO) expressions. Exception-handling thus extracts more meaning than exists out of pure sub-expressions, breaking compositionality."
  - "IO also includes concurrency, which is even more troublesome."
- https://stackoverflow.com/a/1030631
  - conal mentions denotational semantics
  - "fine-grained, determinate, and continuous"
  - "due to nondeterministic interleaving"
- https://wiki.haskell.org/Functional_Reactive_Programming
  - lists many implementations of frp
- http://conal.net/blog/posts/trimming-inputs-in-functional-reactive-programming
- https://elm-lang.org/news/farewell-to-frp
- https://futureofcoding.org/essays/dctp.html
- https://apfelmus.nfshost.com/blog/2012/09/03-frp-dynamic-event-switching-0-7.html
- https://ncatlab.org/nlab/show/temporal+logic#Jeffrey12
- https://www.haskellforall.com/2013/04/pipes-concurrency-100-reactive.html
- https://markkarpov.com/post/free-monad-considered-harmful.html
- http://conal.net/blog/posts/why-classic-FRP-does-not-fit-interactive-behavior
  - explains Paul Hudak = Yale = Yampa
  - and why he's not into arrowized-frp

# books

- https://www.manning.com/books/functional-reactive-programming

# talks

- https://www.youtube.com/watch?v=2oJtZs0XFlU

# wiki

- https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods
