# Pino Sentry transport

![NPM](https://img.shields.io/npm/l/pino-sentry-transport)
![NPM](https://img.shields.io/npm/v/pino-sentry-transport)
![GitHub Workflow Status](https://github.com/tomer-yechiel/pino-sentry-transport/actions/workflows/pino-sentry-transport.yml/badge.svg?branch=main)

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
      context: ['hostname'] // sentry context to add to the event, uses lodash.get to get the value from the log record,
      minLevel: 40, // which level to send to sentry
    }
  },
});
```

if log contain error, it will send to sentry using captureException if not it will use captureMessage.
