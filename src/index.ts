import type { Transform } from "node:stream";
import {
  type NodeOptions,
  type SeverityLevel,
  captureException,
  captureMessage,
  getClient,
  init,
} from "@sentry/node";
import type { Extras, Primitive, Scope } from "@sentry/types";
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
   * Sentry context to add directly to the event.
   * If we see a log record with this key, we'll add every key/value pair in the object to the Sentry event as context.
   * Special keys like 'user', 'extras', 'tags' will be handled appropriately: https://docs.sentry.io/platforms/javascript/enriching-events/context/#passing-context-directly
   * If the value on the log record is not an object, this option will have no effect.
   *
   * For example, if contextObjectKey is set to "sentryContext", and you do `logger.error({msg: "Something bad happened", sentryContext: { someKey: "someValue", user: { id: 123, email: "test@test.com" } }})`
   * then `user` and `someKey` will be added to the Sentry event as context.
   */
  contextObjectKey?: string;
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

    if (pinoSentryOptions.contextObjectKey) {
      const sentryContext = pinoEvent[pinoSentryOptions.contextObjectKey];

      if (typeof sentryContext === "object") {
        for (const [key, value] of Object.entries(sentryContext)) {
          if (key === "user") {
            scope.setUser(value);
          } else if (key === "tags") {
            scope.setTags(value as Record<string, Primitive>);
          } else if (key === "extras") {
            scope.setExtras(value as Extras);
          } else {
            scope.setContext(key, value as Record<string, unknown> | null);
          }
        }
      }
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
