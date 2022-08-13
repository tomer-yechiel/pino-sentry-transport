import { captureException, captureMessage, init, NodeOptions } from "@sentry/node";
import { Scope } from "@sentry/types/types/scope";
import build from "pino-abstract-transport";
import { deserializePinoError, pinoLevelToSentryLevel } from "./utils";

interface PinoSentryOptions {
  sentry?: NodeOptions;
  minLevel?: number;
  withLogRecord?: boolean;
}

export default async function(pinoSentryOptions: PinoSentryOptions) {
  init(pinoSentryOptions.sentry);

  function enrichScope(scope: Scope, pinoEvent) {
    scope.setLevel(pinoLevelToSentryLevel(pinoEvent.level));
    if(pinoSentryOptions.withLogRecord) {
      scope.setContext("pino", pinoEvent);
    }
    return scope;
  }

  return build(async function(source) {
    for await (const obj of source) {

      if (!obj) {
        return;
      }

      const serializedError = obj?.err;
      const level = obj.level;

      if (level > pinoSentryOptions.minLevel) {
        if (serializedError) {
          captureException(deserializePinoError(serializedError), scope => enrichScope(scope, obj));
        } else {
          captureMessage(obj?.msg, scope => enrichScope(scope, obj));
        }
      }
    }
  });
}
