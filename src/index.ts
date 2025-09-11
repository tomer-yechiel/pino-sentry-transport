import type { Transform } from "node:stream";
import {
  captureException,
  captureMessage,
  getClient,
  init,
  type NodeOptions,
  type SeverityLevel,
} from "@sentry/node";
import type { Scope } from "@sentry/types";
import build from "pino-abstract-transport";

const pinoLevelToSentryLevel = (level: number): SeverityLevel => {
  if (level === 60) {
    return "fatal";
  }
  if (level >= 50) {
    return "error";
  }
  if (level >= 40) {
    return "warning";
  }
  if (level >= 30) {
    return "log";
  }
  if (level >= 20) {
    return "info";
  }
  return "debug";
};

function deserializePinoError(pinoErr) {
  const { message, stack } = pinoErr;
  const newError = new Error(message);
  newError.stack = stack;
  return newError;
}

function get<T>(obj: T, path: string): unknown {
  return path.split(".").reduce((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

interface PinoSentryOptions {
  sentry: NodeOptions;
  minLevel: number;
  withLogRecord: boolean;
  tags: string[];
  context: string[];
  /**
   *  @deprecated This property is deprecated and should not be used. It is currently ignored and will be removed in the next major version. see docs.
   */
  skipSentryInitialization: boolean;

  expectPinoConfig: boolean;
}

const defaultOptions: Partial<PinoSentryOptions> = {
  minLevel: 10,
  withLogRecord: false,
  skipSentryInitialization: false,
  expectPinoConfig: false,
};

export default async function (initSentryOptions: Partial<PinoSentryOptions>) {
  const pinoSentryOptions = { ...defaultOptions, ...initSentryOptions };

  const client = getClient();
  const isInitialized = !!client;

  if (!isInitialized) {
    init(pinoSentryOptions.sentry);
  }

  function enrichScope(scope: Scope, pinoEvent) {
    scope.setLevel(pinoLevelToSentryLevel(pinoEvent.level));

    if (pinoSentryOptions.withLogRecord) {
      scope.setContext("pino-log-record", pinoEvent);
    }

    if (pinoSentryOptions.tags?.length) {
      for (const tag of pinoSentryOptions.tags) {
        const value = get(pinoEvent, tag);

        if (
          typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean"
        ) {
          continue;
        }

        scope.setTag(tag, value);
      }
    }

    if (pinoSentryOptions.context?.length) {
      const context = {};
      for (const c of pinoSentryOptions.context) {
        const value = get(pinoEvent, c);

        if (typeof value !== "string") {
          continue;
        }

        context[c] = value;
      }
      scope.setContext("pino-context", context);
    }

    return scope;
  }

  return build(
    async (
      source: Transform &
        build.OnUnknown & { errorKey?: string; messageKey?: string },
    ) => {
      for await (const obj of source) {
        if (!obj) {
          return;
        }

        const serializedError = obj?.[source.errorKey ?? "err"];
        const level = obj.level;

        if (level >= pinoSentryOptions.minLevel) {
          if (serializedError) {
            captureException(deserializePinoError(serializedError), (scope) =>
              enrichScope(scope, obj),
            );
          } else {
            captureMessage(obj?.[source.messageKey ?? "msg"], (scope) =>
              enrichScope(scope, obj),
            );
          }
        }
      }
    },
    { expectPinoConfig: pinoSentryOptions.expectPinoConfig },
  );
}
