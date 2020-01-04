// src/test/Actions/Action2.ts
export async function performAction2(): Promise<{ result: 'Action #2' }> {
  console.debug('Performing Action #2');

  return { result: 'Action #2' };
}
