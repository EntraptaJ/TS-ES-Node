// try/randomTask.ts
import { runActions } from './Actions/Action1';

export async function logMessage(message: string): Promise<void> {
  const actionResults = await runActions();
  console.log(`Dynamic run actions: `, actionResults);

  return console.log(message);
}
