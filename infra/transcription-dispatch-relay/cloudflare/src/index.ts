import {
  runSchedulerRelay,
  type RelayDependencies,
  type SafeLogEntry,
} from "./relay";

export interface Env {
  CRON_SECRET: string;
}

export interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface ScheduledHandler {
  scheduled(
    controller: ScheduledController,
    env: Env,
    context: ExecutionContext,
  ): Promise<void>;
}

export interface WorkerHandler extends ScheduledHandler {
  fetch(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response>;
}

const DEFAULT_ENDPOINT_TIMEOUT_MS = 300_000;
const DEFAULT_RETRY_DELAY_MS = 5_000;

const defaultDependencies: RelayDependencies = {
  fetch: (input, init) => fetch(input, init),
  log: (entry: SafeLogEntry) => console.log(entry),
  now: () => Date.now(),
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  endpointTimeoutMs: DEFAULT_ENDPOINT_TIMEOUT_MS,
  retryDelayMs: DEFAULT_RETRY_DELAY_MS,
};

export function createScheduledHandler(
  dependencies: RelayDependencies = defaultDependencies,
): WorkerHandler {
  return {
    async fetch(request, env, context) {
      void context;

      if (request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "GET" },
        });
      }

      if (!env.CRON_SECRET?.trim()) {
        return new Response(
          JSON.stringify({ error: "CRON_SECRET is not configured" }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        );
      }

      try {
        const result = await runSchedulerRelay(env.CRON_SECRET, dependencies);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({ error: "Scheduler relay failed" }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        );
      }
    },
    async scheduled(controller, env, context) {
      void controller;
      void context;

      if (!env.CRON_SECRET?.trim()) {
        throw new Error("CRON_SECRET is not configured");
      }

      const result = await runSchedulerRelay(env.CRON_SECRET, dependencies);
      const failedEndpoints = result.results
        .filter((endpointResult) => !endpointResult.ok)
        .map((endpointResult) => endpointResult.endpoint);

      if (failedEndpoints.length > 0) {
        throw new Error(
          `Scheduler relay failed for ${failedEndpoints.join(", ")}`,
        );
      }
    },
  };
}

export default createScheduledHandler();
