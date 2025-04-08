import type { Transform } from "node:stream";
import {
  type NodeOptions,
  type SeverityLevel,
  captureException,
  captureMessage,
  getClient,
  init,
} from "@sentry/node";
import type { Scope } from "@sentry/types";
import get from "lodash.get";
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

interface PinoSentryOptions {
  sentry: NodeOptions;
  minLevel: number;
  withLogRecord: boolean;
  tags: string[];
  context: string[];
  /**
   * Specifies keys in the Pino log object whose values should be directly added as Sentry context.
   * For each key in this array:
   *  - If the key exists in the log record and its value is an object,
   *  - The key will be used as the Sentry context key.
   *  - The value will be used as the Sentry context value.
   *
   * This can be used to pass in user, tags, extra, etc., directly if they are already structured correctly in the log record.
   * See https://docs.sentry.io/platforms/node/enriching-events/context for more information.
   */
  directContext?: string[];
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
  directContext: [],
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

    if (pinoSentryOptions.directContext?.length) {
      for (const key of pinoSentryOptions.directContext) {
        const value = pinoEvent[key];
        if (value !== undefined && typeof value === "object") {
          scope.setContext(key, value as Record<string, unknown> | null);
        }
      }
    }

    if (pinoSentryOptions.tags?.length) {
      for (const tag of pinoSentryOptions.tags) {
        scope.setTag(tag, get(pinoEvent, tag));
      }
    }

    if (pinoSentryOptions.context?.length) {
      const context = {};
      for (const c of pinoSentryOptions.context) {
        context[c] = get(pinoEvent, c);
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
