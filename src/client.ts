import EventEmitter from 'events';
import {
  type Context,
  type Unleash,
  UnleashEvents,
  type Variant,
} from 'unleash-client';
import type { FeatureInterface } from 'unleash-client/lib/feature';
import type Metrics from 'unleash-client/lib/metrics';
import { defaultVariant } from 'unleash-client/lib/variant';
import type { IProxyConfig } from './config';
import type { Logger } from './logger';
import { lastMetricsFetch, lastMetricsUpdate } from './prom-metrics';

export type FeatureToggleStatus = {
  name: string;
  enabled: boolean;
  impressionData?: boolean;
  variant?: Variant;
};

interface VariantBucket {
  [s: string]: number;
}

interface Bucket {
  toggles: {
    [s: string]: {
      yes?: number;
      no?: number;
      variants?: VariantBucket;
    };
  };
}

export interface IMetrics {
  bucket: Bucket;
}

export interface IClient extends EventEmitter {
  setUnleashApiToken: (unleashApiToken: string) => void;
  getEnabledToggles: (context: Context) => FeatureToggleStatus[];
  getDefinedToggles: (
    toggleNames: string[],
    context: Context,
  ) => FeatureToggleStatus[];
  getAllToggles: (context: Context) => FeatureToggleStatus[];
  getFeatureToggleDefinitions(): FeatureInterface[];
  registerMetrics(metrics: IMetrics): void;
  isReady(): boolean;
}

export default class Client extends EventEmitter implements IClient {
  readonly unleash: Unleash;

  private unleashApiToken: string;
  private readonly environment?: string;
  private readonly metrics: Metrics;
  private readonly logger: Logger;
  private ready: boolean = false;

  constructor(config: IProxyConfig, unleash: Unleash, metrics: Metrics) {
    super();

    this.unleashApiToken = config.unleashApiToken;
    this.environment = config.environment;
    this.logger = config.logger;

    this.unleash = unleash;
    this.metrics = metrics;

    this.metrics.on('error', (msg) => this.logger.error(`metrics: ${msg}`));
    this.unleash.on('error', (msg) => this.logger.error(msg));
    this.unleash.on('ready', () => {
      this.emit('ready');
      this.ready = true;
      this.metrics.start();
    });
    this.unleash.on(UnleashEvents.Unchanged, () => {
      lastMetricsFetch.set(new Date().getTime());
    });
    this.unleash.on(UnleashEvents.Changed, () => {
      const updatedAt = new Date().getTime();
      lastMetricsFetch.set(updatedAt);
      lastMetricsUpdate.set(updatedAt);
    });
  }

  setUnleashApiToken(unleashApiToken: string): void {
    this.unleashApiToken = unleashApiToken;
  }

  // TODO: 이제 더이상 `environment` 는 사용하지 않지 않나?
  fixContext(context: Context): Context {
    const { environment } = this;
    return environment ? { ...context, environment } : context;
  }

  getAllToggles(inContext: Context): FeatureToggleStatus[] {
    this.logger.debug(
      'Get all feature toggles for provided context',
      inContext,
    );

    const context = this.fixContext(inContext);
    const sessionId = context.sessionId || String(Math.random());
    const contextWithSessionId = { ...context, sessionId };
    const definitions = this.unleash.getFeatureToggleDefinitions() || [];
    return definitions.map((d) => {
      const enabled = this.unleash.isEnabled(d.name, contextWithSessionId);
      const variant = enabled
        ? this.unleash.getVariant(d.name, contextWithSessionId)
        : defaultVariant;
      return {
        name: d.name,
        enabled: enabled,
        variant: variant,
        impressionData: d.impressionData,
      };
    });
  }

  // ENABLED로 평가된 플래그들만 반환.
  getEnabledToggles(inContext: Context): FeatureToggleStatus[] {
    // TODO: 이 로그는 제거해도 되지 싶은데? 당분간은 그냥 두자.
    this.logger.debug(
      'Get enabled feature flags for provided context',
      inContext,
    );

    const context = this.fixContext(inContext);
    const sessionId = context.sessionId || String(Math.random()); // TODO: sessionId가 지정되지 않았을때 random이 맞나?
    const contextWithSessionId = { ...context, sessionId };
    const definitions = this.unleash.getFeatureToggleDefinitions() || [];
    return definitions
      .filter((d) => this.unleash.isEnabled(d.name, contextWithSessionId))
      .map((d) => ({
        name: d.name,
        enabled: true,
        variant: this.unleash.getVariant(d.name, contextWithSessionId),
        impressionData: d.impressionData,
      }));
  }

  // ENABLE/DISABLE 상관없이 모든 평가된 플래그들을 반환.
  getDefinedToggles(
    toggleNames: string[],
    inContext: Context,
  ): FeatureToggleStatus[] {
    const context = this.fixContext(inContext);
    return toggleNames.map((name) => {
      const definition = this.unleash.getFeatureToggleDefinition(name);
      const enabled = this.unleash.isEnabled(name, context);
      this.metrics.count(name, enabled);
      return {
        name,
        enabled,
        variant: this.unleash.getVariant(name, context),
        impressionData: definition?.impressionData ?? false,
      };
    });
  }

  getFeatureToggleDefinitions(): FeatureInterface[] {
    return this.unleash.getFeatureToggleDefinitions();
  }

  /*
   * A very simplistic implementation which support counts.
   * In future we must consider to look at start/stop times
   * and adjust counting thereafter.
   */
  registerMetrics(metrics: IMetrics): void {
    const { toggles } = metrics.bucket;

    Object.keys(toggles).forEach((toggleName) => {
      const toggle = toggles[toggleName];
      const yesCount: number = toggle.yes ?? 0;
      const noCount: number = toggle.no ?? 0;
      [...Array(yesCount)].forEach(() => this.metrics.count(toggleName, true));
      [...Array(noCount)].forEach(() => this.metrics.count(toggleName, false));
      const variants = toggle.variants;
      if (variants) {
        Object.entries(variants).forEach(([variantName, variantCount]) => {
          [...Array(variantCount)].forEach(() =>
            this.metrics.countVariant(toggleName, variantName),
          );
        });
      }
    });
  }

  destroy(): void {
    this.unleash.destroy();
  }

  isReady(): boolean {
    return this.ready;
  }
}
