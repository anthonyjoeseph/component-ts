- brouwer

  - [unreliability of logical principles](https://arxiv.org/pdf/1511.01113)
  - [art, life and mysticism](https://www.hermitary.com/solitude/brouwer.html)
    - "Mysticism is the denial of knowledge"
  - [Brouwer -- Hilbert controversy](https://www.youtube.com/watch?v=AFAmdfJtWIc)
  - [whoops he's a nazi sympathizer](https://www.tabletmag.com/sections/arts-letters/articles/hitlers-math)
  - [mathematics of the continuum](https://www.youtube.com/watch?v=WNAm7TH0iOw)
    - "1689 Leibniz wondered how to captured this intuitive continuity mathematically. He wrote, 'There are two labyrinths of the human mind - one concerning the composition of the Continuum, and the other concerning the nature of freedom - and they arise from the same source - namely, infinity.' Now, as far as we know Brouwer never made an extensive study of Leibniz, but the solution to the question of the mathematical modeling of continuity that Brower came up with depended precisely on the other notion that Leibniz mentions - freedom."
  - [bishop quote](https://philosophy.stackexchange.com/questions/34108/what-does-mathematical-constructivism-gain-us-philosophically)
    - "There is a crisis in contemporary mathematics, and anybody who has not noticed it is being willfully blind. The crisis is due to our neglect of philosophical issues...Every theorem proved with idealistic methods presents a challenge: to find a constructive version, and to give it a constructive proof... Very possibly classical mathematics will cease to exist as an independent discipline."

- [Set vs Type syntax in agda (they're the same)](https://proofassistants.stackexchange.com/a/4190)

- [choice sequences as io](https://lists.chalmers.se/pipermail/agda/2011/003393.html)

  - [mathematics of infinity 1990 pg. 162](https://github.com/michaelt/martin-lof)
  - [partial type theory and non-standard type theory](https://plato.stanford.edu/entries/type-theory-intuitionistic/#PartNonStanTypeTheo)
    - "The types in partial type theory can be interpreted as Scott domains"
    - I think it's basically LUB denotational semantics for types
  - [Computability beyond Turing with Choice Sequences](https://pure-oai.bham.ac.uk/ws/portalfiles/portal/71146432/Computability_Beyond.pdf)

- [choice axiom as heroin](https://youtu.be/DllYOFw5Qio?t=1973)

- [normalizing int in cubical agda (I guess its really hard)](https://proofassistants.stackexchange.com/questions/4662/how-to-normalize-int-in-cubical-agda)

- [a denotational semantics implemented in agda](https://gist.github.com/bobatkey/52ea69e8ad83b438c5318346200ab4f0)

- [homotological trinitarianism](https://ncatlab.org/nlab/files/ShulmanHomotopicalTrinitarianism.pdf)

- [curry/howard and category theory](https://mhamilton.net/files/chl.pdf)

- [intro to MLTT - what is a type?](https://cs.stackexchange.com/questions/14674/intro-to-martin-l%C3%B6f-type-theory/14686#14686)

- Boolean Reasoning - Frank Markham Brown

- [canonical form for algebraic numbers](https://math.stackexchange.com/questions/2529811/canonical-form-for-algebraic-numbers)

- agda rewrite rules (syntax vs pragma)

  - [plfa - rewrite syntax](https://plfa.github.io/Equality/#rewriting)
    - referenced in slides from the 2021 talk:
    - [racket redex](https://docs.racket-lang.org/redex/)
    - [K reducer](https://fsl.cs.illinois.edu/publications/ellison-rosu-2012-popl.pdf)
  - [syntax docs](https://agda.readthedocs.io/en/latest/language/with-abstraction.html#rewrite)
  - [pragma docs](https://agda.readthedocs.io/en/latest/language/rewriting.html#rewrite-rules-by-example)
  - [rewrite pragma re: canonicity](https://gallais.github.io/blog/canonical-structures-REWRITE.html)
  - [hw assignment](https://github.com/kaonn/agda-T-canonicity-dist)
  - [hack your type theory w/ rewrite rules](https://jesper.sikanda.be/posts/hack-your-type-theory.html)

- [agda re: denotational semantics](https://semantic-domain.blogspot.com/2016/03/agda-is-not-purely-functional-language.html)

  > The simple story that we want to start with when teaching functional programming is that data types are sets, and computer functions are mathematical functions. In the presence of general recursion, though, this is a lie.

- agda infinite lists

  - [coinduction](https://blog.ielliott.io/sized-types-and-coinduction-in-safe-agda)
  - [thorsten inf list](https://people.cs.nott.ac.uk/psztxa/g53cfr/l15.html/l15.html)
    - this is ["old coinduction"](https://agda.readthedocs.io/en/latest/language/coinduction.html#old-coinduction)
    - record syntax is preferred

- detecting cycles in a directed graph

  - https://stackoverflow.com/questions/8935323/detecting-cycles-of-a-graphmaybe-directed-or-undirected-in-haskell

- fixed point iteration explanation

  - [use it for square roots](https://stackoverflow.com/questions/67478195/using-fixed-point-to-show-square-root/75264885#75264885)
  - basic intuition:
    - g(x) is achievable thru g(x) = x - f(x)
      - (if we're trying to find roots)
    - we can also get g(x) by simply rearranging to have x on the left hand side
      - this is because x = g(x), so substitution makes this true
    - iteration works because input is supposed to equal output, so doing it over and over again will either converge or diverge
    - "fixed points" exist on g(x), _not_ on f(x)
      - can be visualized as intersections with y = x
      - will be exact same intersections as f(x) has with y = 0

- [how to read type system notation](https://langdev.stackexchange.com/questions/2692/how-should-i-read-type-system-notation)
- [hindley milner notation](https://stackoverflow.com/questions/12532552/what-part-of-hindley-milner-do-you-not-understand)
- [free variables vs bound variables](https://en.wikipedia.org/wiki/Free_variables_and_bound_variables)
- [stanford - type theory](https://plato.stanford.edu/entries/type-theory/#1)
- [denotative programming timeline](https://wiki.haskell.org/Denotative_programming_timeline)
- [wikipedia - denotational semantics](https://en.m.wikipedia.org/wiki/Denotational_semantics)
- [wikipedia - category theory timeline](https://en.wikipedia.org/wiki/Timeline_of_category_theory_and_related_mathematics)
- [inventor of algebra](https://en.wikipedia.org/wiki/Al-Khwarizmi)
- [inventor of variables](https://en.wikipedia.org/wiki/Brahmagupta#Mathematics)
- [nested data parallelism in haskell](https://www.youtube.com/watch?v=kZkO3k9g1ps)
- [wiki.haskell - IO Semantics](https://wiki.haskell.org/IO_Semantics)
- [a semantic framework for deterministic function io](https://publications.scss.tcd.ie/tech-reports/reports.06/TCD-CS-2006-19.pdf)
- [lean language - denotational semantics](https://lean-forward.github.io/logical-verification/2018/33_notes.html)
- [the formal semantics of programming languages](https://www.cin.ufpe.br/~if721/intranet/TheFormalSemanticsofProgrammingLanguages.pdf)
- [tackling the awkward squad - spj](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/07/mark.pdf)
- [Thorsten - Functional semantics for the awkward squad](https://people.cs.nott.ac.uk/psztxa/publ/beast.pdf)
- [IO Monad as gadt (frp contributor Luke Palmer)](https://web.archive.org/web/20111016161358/http://lukepalmer.wordpress.com/2008/03/29/io-monad-the-continuation-presentation/)
- [Wadler - How to Declare and Imperative (mind/body)](https://ics.uci.edu/~jajones/INF102-S18/readings/24_wadler)
- [The Haskell programmer's guide to the IO Monad (Dont Panic)](https://stefan-klinger.de/files/monadGuide.pdf)
- [How can denotational semantics be defined for imperative statements](https://langdev.stackexchange.com/questions/2646/how-can-denotational-semantics-be-defined-for-imperative-statements)

- research previous attempts at denoting io

  - [IO monad - ncatlab](https://ncatlab.org/nlab/show/IO-monad)
  - [SO post - monad != state of world](https://softwareengineering.stackexchange.com/questions/161568/critique-of-the-io-monad-being-viewed-as-a-state-monad-operating-on-the-world)
  - [free monads for less - yielding io](http://comonad.com/reader/2011/free-monads-for-less-3/)
  - [the io problem - haskell wiki](https://wiki.haskell.org/The_I/O_problem)

- research exception handling in IO

  - does this break the monad laws?
    - similarly, does `unsafeInterleaveIO`?
    - would be great if we could say simply, without complication, that "this denotation is true if io has a lawful monad instance"
  - [Control.Exception docs](https://hackage.haskell.org/package/base-4.21.0.0/docs/Control-Exception.html)
  - [haskell wiki](https://wiki.haskell.org/Handling_errors_in_Haskell)

- simultaneity in our denotation of hot observable equality

  - research interleaving and its relationship to denotation
    - can we just throw a `seq` into `subscribe` or `newAddHandler`?
    - what are the tradeoffs for this?
    - does a = b even if b is slightly ahead of a? `delay(1)` should break equality
    - is it ever possible for another io to emit _between_ these two ios:
    ```
      io1 = return 1
      io2 = return 2
      io3 = io1 >>= \_ -> io2
    ```
  - [unsafeInterleaveST](https://okmij.org/ftp/Haskell/)
    - section: "Breaking referential transparency with unsafeInterleaveST"
    - [also heere](https://okmij.org/ftp/Haskell/#unsafeInterleaveST)
  - [in defense of lazy io](http://comonad.com/reader/2015/on-the-unsafety-of-interleaved-io/)
  - [oleg shows lazy io breaks purity](https://mail.haskell.org/pipermail/haskell/2009-March/021065.html)
  - [unsafeInterleaveIO docs](https://hackage.haskell.org/package/base-4.21.0.0/docs/System-IO-Unsafe.html#v:unsafeInterleaveIO)
  - [haskell concurrency model docs](https://hackage.haskell.org/package/base-4.21.0.0/docs/Control-Concurrent.html)

- investigate LTL - Linear Temporal Logic

  - [basic intro](https://www.cds.caltech.edu/~murray/courses/afrl-sp12/L3_ltl-24Apr12.pdf)
  - [blog post](https://www.cwblogs.com/posts/linear-temporal-logic/)
  - [lecture](https://www.youtube.com/watch?v=--4S7HjoZho)
  - [modal mu calculus](https://www.julianbradfield.org/Research/MLH-bradstir.pdf)
  - [frp for free](https://haskellexists.blogspot.com/2016/01/frp-for-free.html)

- investigate `batch:: Hot a -> Cold [a]`

  - it collects all hot emissions
    - on "subscribe", it emits everything that had come before it in an array
  - maybe this can just be some implemented as some kind of reference that's passed around, since everything becomes hot anyway?
    - or else, does this need to be a primitive?
  - useful for implementing some version of "hyper-ts" where `headers:: Hot` and `body:: Cold`, so that we never mix emissions of the two

- prove infinite list equality for ones, oneTwo, and alphaLoop

- investigate what a `scheduler` might mean for an rx in haskell

  - see above
  - a monotonic list scheduler would delay every emission by some constant "d"
    - if d = 3
    - [(a, 0), (b, 1), (c, 2), ...]
    - [(a, 3), (b, 6), (c, 9), ...]

- are we able to prove a link between IORef and Fran?

  - a kind of "euler's identity" where we're able to spookily relate an io to a non-io
  - the constructs for a denotative monad that models io look an awful lot like events & behaviors ...
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

  - [sound wrt contextual equivalence](https://siek.blogspot.com/2017/03/sound-wrt-contextual-equivalence.html)
  - [learning agda (conal resources)](https://github.com/conal/Collaboration/blob/master/learning-agda.md)
  - [agda in a nutshell - serokell](https://serokell.io/blog/agda-in-nutshell)
  - [learn you an agda](https://williamdemeo.github.io/2014/02/27/learn-you-an-agda/)
  - [programming language foundations in agda](https://plfa.github.io/)
  - [contextual equivalence in agda](https://plfa.github.io/ContextualEquivalence/)
    - is this useful to know what we're proving? aka what is contextual equivalence?
    - or is it mostly useful as a way to learn agda?
    - is this a good enough understanding?
      - [tutorial of denotational semantics - 1976](https://citeseerx.ist.psu.edu/document?repid=rep1&type=pdf&doi=8805dca7369fddcfcfcb5f8ac8a9dcd3fd857930)
      - [the actual paper - 1971](https://www.cs.cmu.edu/~crary/819-f09/Scott71.pdf)
  - [referential transparency, definiteness and unfoldability](https://www.itu.dk/~sestoft/papers/SondergaardSestoft1990.pdf)
    - might be helpful to know what equality "means" in some sense
  - [category: the essence of composition](https://bartoszmilewski.com/2014/11/04/category-the-essence-of-composition/)
    - might be helpful to know what equality "means" in some other sense
  - [constructivism](<https://en.wikipedia.org/wiki/Constructivism_(philosophy_of_mathematics)>)
    - are we violating constructivism by using a proof by contradiction to say that a = b?

- include "concatMap" in haskell rx

- agda???????

  - [the lax braided structure of streaming io](https://drops.dagstuhl.de/storage/00lipics/lipics-vol012-csl2011/LIPIcs.CSL.2011.292/LIPIcs.CSL.2011.292.pdf)
    - [games - A Full Abstraction for PCF](https://www.cs.ox.ac.uk/files/323/pcf.pdf)
    - [Kahn Process Networks lecture](https://ptolemy.berkeley.edu/projects/embedded/eecsx44/lectures/Spring2013/dataflow.pdf)
    - [repo](https://github.com/agda-attic/agda-system-io)
    - [LaxBraided.agda](https://github.com/agda-attic/agda-system-io/blob/master/src/System/IO/Transducers/Properties/LaxBraided.agda)
  - [a quick introduction to denotational semantics in agda](https://gist.github.com/bobatkey/52ea69e8ad83b438c5318346200ab4f0)
  - [production agda libraries (io)](https://wiki.portal.chalmers.se/agda/Main/Libraries)
    - [lemmamachine](https://github.com/larrytheliquid/Lemmachine)
      - agda for 'unit tests' and 'integration tests'
    - [agda-system-io](https://github.com/agda-attic/agda-system-io)
      - kinda boring?
    - [frp w/ linear temporal logic](https://github.com/agda-attic/agda-frp-ltl)
  - [learn you an agda](https://williamdemeo.github.io/2014/02/27/learn-you-an-agda/)

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

  - [ghcjs-dom](https://hackage.haskell.org/package/ghcjs-dom)
    - says that it works with both ghcjs and ghc
  - [formal documentation comments](https://mmhaskell.com/blog/comments-in-haskell)
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
