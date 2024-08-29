NOTE: Save examples in directory of their own - will use as a form of docs

- TextNode component w/ optional observable
- Fragment component w/ 'domActions' (and remove from other nodes?)
  - btw - if no parent element exists, we can use document.children instead!
- domActionsChildren should accept an array of domActions
  - apply them on a fragment & then replaceAll
  - to prevent flicker
  - also to ensure indexes are correct w/o race conditions
    - do we need concatmap for this as well?
- clean up interface
  - can we expose everything w/o having to know how it works?
    - only tags that accept strings | numbers | undefined | null should be considered in 'renderToString'
  - element.style & element.classList
  - accept addEventListener obj (passive etc)
    - another helper fn to do this in X-browser way
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

https://github.com/reactwg/react-18/discussions/37

https://jser.dev/react/2023/04/20/how-do-react-server-components-work-internally-in-react/

https://github.com/facebook/react/tree/main/packages/react-reconciler
