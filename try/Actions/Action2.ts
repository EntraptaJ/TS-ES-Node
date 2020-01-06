// src/test/Actions/Action2.ts
import { action2Sub } from './Action1'

export async function performAction2(): Promise<{ result: 'Action #2' }> {
  console.debug('Performing Action #2');

  const actionSub = await action2Sub()

  console.log(`Action 2 Sub: ${actionSub}`)

  return { result: 'Action #2' };
}
