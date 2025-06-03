# Pino Sentry transport

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

[//]: # ([![GitHub Workflow Status]&#40;https://github.com/tomer-yechiel/pino-sentry-transport/actions/workflows/pino-sentry-transport.yml/badge.svg?branch=main&#41;]&#40;https://github.com/tomer-yechiel/pino-sentry-transport/actions&#41;)



**Pino Sentry Transport** allows you to send logs from [Pino](https://github.com/pinojs/pino) directly to [Sentry](https://sentry.io/).


## Installation

```shell
npm i pino-sentry-transport
```

## Usage

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
            withLogRecord: true, // default false - send the entire log record to sentry as a context.(FYI if its more then 8Kb Sentry will throw an error)
            tags: ['level'], // sentry tags to add to the event, uses lodash.get to get the value from the log record
            context: ['hostname'], // sentry context to add to the event, uses lodash.get to get the value from the log record,
            minLevel: 40, // which level to send to sentry
            expectPinoConfig: true, // default false - pass true if pino configured with custom messageKey or errorKey see below
            sendBreadcrumbs: true, // default false - send the log record as a breadcrumb to Sentry
        }
    },
});
```


### Configuration Options

- **`withLogRecord`**: When set to `true`, sends the entire log record as context to Sentry. Be cautious of log records larger than 8KB, as Sentry will throw an error.
- **`tags`**: An array specifying which fields from the log record should be added as tags in Sentry. Uses `lodash.get` to extract values.
- **`context`**: An array specifying which fields from the log record should be added as context in Sentry. Also uses `lodash.get` for value extraction.
- **`minLevel`**: The minimum log level required for a message to be sent to Sentry. Log levels follow Pino's conventions (e.g., 40 for 'error').
- **`expectPinoConfig`**: If set to `true`, allows the transport to work with custom `messageKey` or `errorKey` settings in Pino.
- **`sendBreadcrumbs`**: If set to `true`, sends the log record as a breadcrumb to Sentry.


### Sentry initialization
Because Pino transport runs in a separate worker thread, Sentry needs to be [initialized](https://docs.sentry.io/platforms/javascript/configuration/webworkers/#usage-with-worker-level-initialization) in the transport.


### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



[npm-version-src]: https://img.shields.io/npm/v/pino-sentry-transport
[npm-version-href]: https://npmjs.com/package/pino-sentry-transport
[npm-downloads-src]: https://img.shields.io/npm/dm/pino-sentry-transport
[npm-downloads-href]: https://npmjs.com/package/pino-sentry-transport
[bundle-src]: https://img.shields.io/bundlephobia/minzip/pino-sentry-transport?label=minzip
[bundle-href]: https://bundlephobia.com/result?p=pino-sentry-transport
[license-src]: https://img.shields.io/github/license/tomer-yechiel/pino-sentry-transport.svg
[license-href]: https://github.com/tomer-yechiel/pino-sentry-transport/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12
[jsdocs-href]: https://www.jsdocs.io/package/pino-sentry-transport
