// test/stuff.ts
import { runActions } from './Actions/Action1';

async function testing(input: string): Promise<string> {
  return input;
}

console.log('Starting index.ts');

const results = await runActions();

console.log(`Results: `, results);

console.log('Testing dynamic import');

const { logMessage } = await import('./randomTask');

await logMessage(`I'm logging from the dynamic import!`);

testing('helloWorld');
