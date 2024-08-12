NOTE: Save examples in directory of their own - will use as a form of docs

1. integrate w/ Parcel - npm scripts "dev" and "build"
   1. `"dev": "concurrently --kill-others \"npm run start-watch\" \"npm run wp-server\""`
1. button "increment counter" example
1. hydrate should return observable of all changes, ever
1. observableState where you can "listen" to a path
1. two buttons that "increment" individually
   1. use "hydrate" ret val to ensure isolated updates
1. "insertChild" on createElement
   1. hydrate should "mergeMap" on this for return values
1. button that creates buttons example
1. "removeChild" on createElement
   1. hydrate should "switchMap" on this so as not to return unlistened changes (?) takeUntil (?)
1. button that removes buttons
1. observableState "combineLatest" for "getValue"-type stuff
   1. type should be union w/ "undefined"
1. form data example - button to output struct of all fields
1. observableState that diffs & outputs changes to an array
   1. insertAt, removeAt
   1. propogates changes instead of "replaceAt"
1. helper fn to faciilitate "insertAt -> insertChild" and "removeAt -> removeChild"
1. example: input field of json array of numbers, button to render it in DOM

Nice-to-have:

1. fix "createElement" interface to have "getID" as callback
1. code splitting (see notes)
1. SSG
1. SSR (see notes)
1. xss
1. markdown output (markedjs ?)
1. other cybersecurity (csrf?)
