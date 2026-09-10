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
): ScheduledHandler {
  return {
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
