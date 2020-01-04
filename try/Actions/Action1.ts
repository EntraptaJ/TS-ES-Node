// src/test/Actions/Action1.ts
import { performAction2 } from './Action2';

async function performAction1(): Promise<{ result: 'Action #1' }> {
  console.debug('Performing Action #1');
  return { result: 'Action #1' };
}

export async function runActions(): Promise<{
  result1: 'Action #2';
  result2: 'Action #1';
}> {
  const [{ result: result1 }, { result: result2 }] = await Promise.all([
    performAction2(),
    performAction1(),
  ]);
  return { result1, result2 };
}
