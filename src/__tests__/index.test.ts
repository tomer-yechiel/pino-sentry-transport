import { setTimeout } from "timers/promises";
import pino from "pino";
import { test } from "vitest";


const transport = pino.transport({
  target: "../../build/cjs/index.js",
  options: {
    sentry: {
      dsn: 'https://796cf185f9b84a29bb20e6df0d9a5d68@o1288589.ingest.sentry.io/6505642'
    },
    minLevel: 10,
    withLogRecord: true
  }
});

const logger = pino(transport);

test("log record get to Sentry", async () => {
  logger.error({ err: new Error("test 123"), foo: "bar" });
  await setTimeout(1000);
}, 10000);

