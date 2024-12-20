import type { Application } from 'express';
import { createApp } from './app';
import type { IProxyOption } from './config';

export function start(opt: IProxyOption = {}): Application {
  const port = process.env.PORT || process.env.PROXY_PORT || 3_000;

  const app = createApp(opt);

  app.listen(port, () =>
    console.log(`Ganpa-proxy is listening on port ${port} ...`),
  );

  return app;
}
