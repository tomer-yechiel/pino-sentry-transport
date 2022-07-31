import { NodeOptions, SeverityLevel } from "@sentry/node";
import * as Sentry from "@sentry/node";
import build from "pino-abstract-transport";

export const pinoLevelToSentryLevel = (level: number): SeverityLevel => {
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

interface PinoSentryOptions {
  sentry?: NodeOptions;
  minLevel?: number;
}

class ExtendedError extends Error {
  public constructor(message: string, stack: string) {
    super(message);

    this.name = "Error";
    this.stack = stack || null;
  }
}

export default async function (pinoSentryOptions: PinoSentryOptions) {
  Sentry.init(pinoSentryOptions.sentry);

  return build(async function (source) {
    for await (const obj of source) {
      if(!obj) {
        return;
      }
      const stack = obj?.err?.stack;
      const errorMessage = obj?.err?.message;
      const level = obj.level;
      const scope = new Sentry.Scope();
      const extra = obj?.extra;
      if(extra){
        scope.setExtras(obj?.extra);
      }
      scope.setLevel(pinoLevelToSentryLevel(level));
      if (level > pinoSentryOptions.minLevel) {
        if (stack) {
          Sentry.captureException(
            new ExtendedError(errorMessage, stack),
            scope
          );
        } else {
          Sentry.captureMessage(obj?.msg, scope);
        }
      }
    }
  });
}
