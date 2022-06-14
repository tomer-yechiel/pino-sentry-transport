import Sentry from '@sentry/node';
import build from 'pino-abstract-transport'

export default async function () {
  Sentry.init({
    dsn: 'https://300e099cd83d4e6a8656272d2b9d54ee@o1173646.ingest.sentry.io/6505195',
    // ...
  });

  return build(async function (source) {
    for await (const obj of source) {
      Sentry.captureException(obj);
    }
  }, {
    async close (err) {
      await Sentry.flush()
    }
  })
}
