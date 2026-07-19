import { timingSafeEqual } from "node:crypto";

import { getWorkerEnv } from "@/shared/config/worker-env";

const bearerPrefix = "Bearer ";

export function authorizeWorkerRequest(
  authorization: string | null,
  cronSecret: string,
) {
  if (!authorization?.startsWith(bearerPrefix) || !cronSecret) return false;

  const token = authorization.slice(bearerPrefix.length);
  if (!token) return false;

  const expected = Buffer.from(cronSecret);
  const received = Buffer.from(token);
  if (expected.length !== received.length) return false;

  return timingSafeEqual(expected, received);
}

export function authorizeConfiguredWorkerRequest(authorization: string | null) {
  return authorizeWorkerRequest(authorization, getWorkerEnv().cronSecret);
}
