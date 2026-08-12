import { randomUUID } from "node:crypto";

export function createInvocationToken(workerRole: string, id = randomUUID()) {
  return `${workerRole}:${id}`;
}
