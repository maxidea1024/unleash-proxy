import { type Gauge, createGauge } from './createGauge';
import { createCounter } from './createCounter';

export * from './createCounter';
export * from './createGauge';

export const lastMetricsUpdate: Gauge = createGauge({
  name: 'last_metrics_update_epoch_timestamp_ms',
  help: 'An epoch timestamp (in milliseconds) set to when our ganpa-client last got an update from upstream Ganpa',
});

export const lastMetricsFetch: Gauge = createGauge({
  name: 'last_metrics_fetch_epoch_timestamp_ms',
  help: 'An epoch timestamp (in milliseconds) set to when our ganpa-client last checked (regardless if there was an update or not)',
});

createCounter({
  name: 'ganpa_proxy_up',
  help: 'Indication that the service is up.',
}).inc(1);
