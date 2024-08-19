NOTE: Save examples in directory of their own - will use as a form of docs

- TextNode component w/ 'domActionsAdjacent' & 'after' & stuff
- clean up interface
  - can we expose everything w/o having to know how it works?
  - element.style & element.classList
  - accept addEventListener obj (passive etc)
    - another helper fn to do this in X-browser way
- type that infers optional keys vs nullable values
  - for behaviorStruct kinda thing
  - pass in default type & value, output:
    - obj w/ BehaviorSubjects as leaves
    - BehaviorSubject w/ full default type (so we can "getValue" on it)
- routing example
- code splitting
  - simply use 'prepend' and 'rxjs.defer'
- SSR example
- SSG example
- cybersecurity example
  - XSS
  - CSRF
- markdown generated site
- render react components

https://www.netlify.com/blog/2019/03/11/deep-dive-how-do-react-hooks-really-work/

https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
