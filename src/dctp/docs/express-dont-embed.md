# express, don't embed

## or, encapsulation considered harmful

the counterpoint to "parse, don't validate"

"node-http" -> "hyper" in purescript is the example

what "hyper" gains in correctness, it loses in expressivity

"hyper" is a constrained version of an io streaming library

It lacks the combinators of rx, or has to re-invent them

hyper's eDSL is analagous (equivalent?) to "encapsulation" in OO languages

in a model `Request -> IO<Response>`, our server library returns `concat(headers, body)` where "body" must be a cold observable

we can say that the model of "streams" embedded by hyper is generalized by rx in a more expressive way

hyper's phantom type is a symptom of it's under-generalization

it's ok for Rx to "encapsulate" and have _its_ phantom type, because its boundaries have been studied and proven not to leak (note to author: do this)

the basic idea is analagous to the maxim that "older ideas break less often" because they've "stood the test of time"

a out-of-date CTO might want to use tomcat - not only because it's well understood, but because they can be certain it won't break

taking this idea to its logical conclusion, if tomcat is a basic fact of web development, monoids are a basic fact of the universe (that will never go out of date)

To over-generalize, mappings between categories are always allowed to do "encapsulation" (?) because their boundaries are guaranteed to be "correct"

Anything less general will necessarily sacrifice expressivity, aka "leak"

so I claim - more type information is not always better

anyway, in a turing-complete (non-total) language, the halting problem proves that compile-time safety is impossible

stated differently, the existence of `undefined` (and therefore infinite loops & exceptions) in haskell is a _requirement_ for a denotational semantics

(show how bottom types are used to prove that recursive functions converge iff their functional has a supremum)
