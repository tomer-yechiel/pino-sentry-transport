import { setTimeout } from "timers/promises";
import pino from "pino";
import { test } from "vitest";

const transport = pino.transport({
  target: "../../build/cjs/index.js",
  options: {
    sentry: {
      dsn: "",
    },
    minLevel: 10,
    withLogRecord: true,
  },
});

const logger = pino(transport);

test("log record get to Sentry", async () => {
  logger.error({ err: new Error("test 123"), foo: "bar" });
  await setTimeout(1000);
}, 10000);
