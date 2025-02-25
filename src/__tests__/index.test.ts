import type { Transform } from "node:stream";
import {
  captureException,
  captureMessage,
  getClient,
  init,
} from "@sentry/node";
import { afterEach, expect, test, vi } from "vitest";
import pinoSentryTransport from "../index";

vi.mock("@sentry/node", () => {
  const captureException = vi.fn();
  const captureMessage = vi.fn();
  const init = vi.fn();
  const getClient = vi.fn(() => undefined);
  return { captureException, captureMessage, init, getClient };
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("should initialize Sentry", async () => {
  const sentry = { dsn: "fake dsn" };
  await pinoSentryTransport({
    sentry,
  });

  expect(getClient).toHaveBeenCalled();
  expect(init).toHaveBeenCalledOnce();
  expect(init).toHaveBeenCalledWith(sentry);
});

// test("should skip Sentry initialization if already initialized", async () => {
//   vi.spyOn(getCurrentHub(), "getClient").mockReturnValue({} as Client<ClientOptions<BaseTransportOptions>>);
//   const sentry = { dsn: "fake dsn" };
//   await pinoSentryTransport({
//     sentry,
//   });
//   expect(getCurrentHub).toHaveBeenCalled();
//   expect(init).not.toHaveBeenCalled();
// })

test("should send logs to Sentry if message level is above the threshold", async () => {
  const transform = (await pinoSentryTransport({
    sentry: { dsn: "fake dsn" },
    minLevel: 50,
  })) as Transform;

  const logs = [
    {
      level: 10,
      time: 1617955768092,
      pid: 2942,
      hostname: "MacBook-Pro.local",
      msg: "hello world",
    },
    {
      level: 20,
      time: 1617955768092,
      pid: 2942,
      hostname: "MacBook-Pro.local",
      msg: "another message",
      prop: 42,
    },
    {
      level: 30,
      time: 1617955768092,
      pid: 2942,
      hostname: "MacBook-Pro.local",
      msg: "another message",
      prop: 42,
    },
    {
      level: 40,
      time: 1617955768092,
      pid: 2942,
      hostname: "MacBook-Pro.local",
      msg: "another message",
      prop: 42,
    },
    {
      level: 50,
      time: 1617955768092,
      pid: 2942,
      hostname: "MacBook-Pro.local",
      msg: "another message",
      prop: 42,
    },
  ];

  const logSerialized = logs.map((log) => JSON.stringify(log)).join("\n");

  transform.write(logSerialized);
  transform.end();

  await new Promise<void>((resolve) => {
    transform.on("end", () => {
      expect(captureMessage).toHaveBeenCalledOnce();
      expect(captureException).not.toHaveBeenCalled();
      resolve();
    });
  });
});

test("should send Errors to Sentry", async () => {
  const transform = (await pinoSentryTransport({
    sentry: { dsn: "fake dsn" },
    minLevel: 50,
  })) as Transform;

  const logs = [
    {
      level: 10,
      time: 1617955768092,
      pid: 2942,
      hostname: "MacBook-Pro.local",
      msg: "hello world",
    },
    {
      level: 50,
      time: 1617955768092,
      pid: 2942,
      hostname: "MacBook-Pro.local",
      err: {
        message: "error message",
        stack: "error stack",
      },
      msg: "hello world",
    },
  ];

  const logSerialized = logs.map((log) => JSON.stringify(log)).join("\n");

  transform.write(logSerialized);
  transform.end();

  await new Promise<void>((resolve) => {
    transform.on("end", () => {
      expect(captureMessage).not.toHaveBeenCalled();
      expect(captureException).toHaveBeenCalledOnce();
      resolve();
    });
  });
});
