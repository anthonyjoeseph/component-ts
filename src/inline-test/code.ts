import { defer } from 'rxjs';

const myA = 5;

const myval = defer(() => [33]);

const myotherval = addTwo(myA);