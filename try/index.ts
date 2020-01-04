// test/stuff.ts
import { runActions } from './Actions/Action1';

console.log('Starting index.ts');

const results = await runActions();

console.log(`Results: `, results);

console.log('Testing dynamic import');

const { logMessage } = await import('./randomTask');

await logMessage(`I'm logging from the dynamic import!`);
