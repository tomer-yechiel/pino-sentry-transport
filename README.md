# Pino Sentry transport

![NPM](https://img.shields.io/npm/l/pino-sentry-transport)
![NPM](https://img.shields.io/npm/v/pino-sentry-transport)
![GitHub Workflow Status](https://github.com/tomer-yechiel/pino-sentry-transport/actions/workflows/pino-sentry-transport.yml/badge.svg?branch=main)

This module provides a 'transport' for pino that sends errors to Sentry.
## Install

```shell
npm i pino-sentry-transport
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
        // aditional options for sentry
      },
    },
  },
});
```
