// test/stuff.ts
import fsExtra from 'fs-extra';
import { saySomething } from './stuff2';

console.log(fsExtra);

export async function sayHelloWorld(): Promise<'helloWorld'> {
  return 'helloWorld';
}

const helloWorld = await sayHelloWorld();

console.log(`test/stuff.ts says ${helloWorld}`);

const test2Said = await saySomething();

console.log(`Test2 says: `, test2Said, `In stuff1`);
