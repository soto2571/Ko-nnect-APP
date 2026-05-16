import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://036cada83af4e1dcc5226f3d405bb4c4@o4511401485991936.ingest.us.sentry.io/4511401504210944',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  tracesSampleRate: 1.0,
  debug: false,
});
