# Pino Sentry transport

![NPM](https://img.shields.io/npm/l/pino-sentry-transport)
[![npm version](https://img.shields.io/npm/v/pino-sentry-transport)](https://www.npmjs.com/package/pino-sentry-transport)
[![GitHub Workflow Status](https://github.com/tomer-yechiel/pino-sentry-transport/actions/workflows/pino-sentry-transport.yml/badge.svg?branch=main)](https://github.com/tomer-yechiel/pino-sentry-transport/actions)



This module provides a 'transport' for pino that sends errors to Sentry.

## Install

```shell
npm i @sentry/node pino-sentry-transport
```

## usage

```typescript
import pino from "pino";

const logger = pino({
    transport: {
        target: "pino-sentry-transport",
        options: {
            sentry: {
                dsn: "https://<key>:<secret>@sentry.io/<project>",
                // additional options for sentry
            },
            withLogRecord: true, // default false - send the log record to sentry as a context.(if its more then 8Kb Sentry will throw an error)
            tags: ['id'], // sentry tags to add to the event, uses lodash.get to get the value from the log record
            context: ['hostname'], // sentry context to add to the event, uses lodash.get to get the value from the log record,
            minLevel: 40, // which level to send to sentry
            expectPinoConfig: true, // default false - pass true if pino configured with custom messageKey or errorKey see below
        }
    },
});
```

if log contain error, it will send to sentry using captureException if not it will use captureMessage.

### Sentry initialization
Because Pino transport runs in a separate worker thread, Sentry needs to be [initialized again](https://docs.sentry.io/platforms/javascript/configuration/webworkers/#usage-with-worker-level-initialization) in the worker.
usually it means Sentry need to be initialized twice   

1. in the application code
2. in pino-sentry-transport


expectPinoConfig is passed to pino-abstract-transport to allow Pino to pass the messageKey and errorKey to the transport [pino-abstract-transport](https://github.com/pinojs/pino-abstract-transport?tab=readme-ov-file#using-pino-config)