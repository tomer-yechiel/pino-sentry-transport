import {
  captureException,
  captureMessage,
  init,
  NodeOptions,
  SeverityLevel,
} from "@sentry/node";
import { Scope } from "@sentry/types/types/scope";
import get from "lodash.get";
import build from "pino-abstract-transport";

const pinoLevelToSentryLevel = (level: number): SeverityLevel => {
  if (level == 60) {
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
  minLevel?: number;
  withLogRecord?: boolean;
  tags?: string[];
  context?: string[];
}

const defaultOptions: Partial<PinoSentryOptions> = {
  minLevel: 10,
  withLogRecord: false,
};

export default async function (
  initSentryOptions: Partial<PinoSentryOptions>
) {
  const pinoSentryOptions = { ...defaultOptions, ...initSentryOptions }

  init(pinoSentryOptions.sentry);

  function enrichScope(scope: Scope, pinoEvent) {
    scope.setLevel(pinoLevelToSentryLevel(pinoEvent.level));

    if (pinoSentryOptions.withLogRecord) {
      scope.setContext("pino-log-record", pinoEvent);
    }

    if (pinoSentryOptions.tags?.length) {
      pinoSentryOptions.tags.forEach((tag) =>
        scope.setTag(tag, get(pinoEvent, tag))
      );
    }

    if (pinoSentryOptions.context?.length) {
      const context = {};
      pinoSentryOptions.context.forEach(
        (c) => (context[c] = get(pinoEvent, c))
      );
      scope.setContext("pino-context", context);
    }

    return scope;
  }

  return build(async function (source) {
    for await (const obj of source) {
      if (!obj) {
        return;
      }

      const serializedError = obj?.err;
      const level = obj.level;

      if (level > pinoSentryOptions.minLevel) {
        if (serializedError) {
          captureException(deserializePinoError(serializedError), (scope) =>
            enrichScope(scope, obj)
          );
        } else {
          captureMessage(obj?.msg, (scope) => enrichScope(scope, obj));
        }
      }
    }
  });
}
