import { setTimeout } from "timers/promises";
import pino, { transport } from "pino";
import { test } from "vitest";

const transpor = transport({
  target: "../../build/cjs/index.js",
  options: {
    sentry: {
      dsn: "",
    },
    minLevel: 10,
    tags: ["time"],
    context: ["hostname"],
  },
});

const logger = pino(transpor);

test("log record get to Sentry", async () => {
  logger.error({ err: new Error("test 123"), foo: "bar" });
  await setTimeout(1000);
}, 10000);
