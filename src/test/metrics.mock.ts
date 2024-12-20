import Metrics from 'unleash-client/lib/metrics';

export default class FakeMetrics extends Metrics {
  recordedCount: [string, boolean][] = [];
  recordedCountVariant: [string, string][] = [];

  start() {}

  count(name: string, enabled: boolean) {
    this.recordedCount.push([name, enabled]);
  }

  countVariant(name: string, variantName: string) {
    this.recordedCountVariant.push([name, variantName]);
  }

  on(): this {
    return this;
  }
}
