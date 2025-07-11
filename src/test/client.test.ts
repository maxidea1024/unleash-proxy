import { createProxyConfig } from '../config';
import { LogLevel } from '../logger';
import { createFakeClient } from './create-fake-client';
import type FakeUnleash from './unleash.mock';

test('should add environment to isEnabled calls', () => {
  const config = createProxyConfig({
    unleashApiToken: '123',
    unleashUrl: 'http://localhost:4242/api',
    proxySecrets: ['s1'],
    environment: 'test',
    logLevel: LogLevel.error,
  });

  const { client } = createFakeClient(config);

  const fakeUnleash = client.unleash as FakeUnleash;

  fakeUnleash.toggleDefinitions.push({
    name: 'test',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  client.getEnabledToggles({});

  expect(fakeUnleash.contexts[0].environment).toBe('test');
  client.destroy();
});

test('should respect context environment over proxy environment', () => {
  const config = createProxyConfig({
    unleashApiToken: '123',
    unleashUrl: 'http://localhost:4242/api',
    proxySecrets: ['s1'],
    environment: 'proxy-default',
    logLevel: LogLevel.error,
  });

  const { client } = createFakeClient(config);

  const fakeUnleash = client.unleash as FakeUnleash;

  fakeUnleash.toggleDefinitions.push({
    name: 'test',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  client.getEnabledToggles({ environment: 'context-environment' });

  expect(fakeUnleash.contexts[0].environment).toBe('context-environment');
  client.destroy();
});

test('should use proxy environment as fallback when context has no environment', () => {
  const config = createProxyConfig({
    unleashApiToken: '123',
    unleashUrl: 'http://localhost:4242/api',
    proxySecrets: ['s1'],
    environment: 'proxy-fallback',
    logLevel: LogLevel.error,
  });

  const { client } = createFakeClient(config);

  const fakeUnleash = client.unleash as FakeUnleash;

  fakeUnleash.toggleDefinitions.push({
    name: 'test',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  client.getEnabledToggles({ userId: 'user123' }); // No environment in context

  expect(fakeUnleash.contexts[0].environment).toBe('proxy-fallback');
  client.destroy();
});

test('should not set environment when neither context nor proxy has one', () => {
  const config = createProxyConfig({
    unleashApiToken: '123',
    unleashUrl: 'http://localhost:4242/api',
    proxySecrets: ['s1'],
    // No environment configured
    logLevel: LogLevel.error,
  });

  const { client } = createFakeClient(config);

  const fakeUnleash = client.unleash as FakeUnleash;

  fakeUnleash.toggleDefinitions.push({
    name: 'test',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  client.getEnabledToggles({ userId: 'user123' }); // No environment in context

  expect(fakeUnleash.contexts[0].environment).toBeUndefined();
  client.destroy();
});

test('should return all toggles', () => {
  const config = createProxyConfig({
    unleashApiToken: '123',
    unleashUrl: 'http://localhost:4242/api',
    proxySecrets: ['s1'],
    environment: 'never-change-me',
    logLevel: LogLevel.error,
  });

  const { client } = createFakeClient(config);

  const fakeUnleash = client.unleash as FakeUnleash;

  fakeUnleash.toggleDefinitions.push({
    name: 'test',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  fakeUnleash.toggleDefinitions.push({
    name: 'test-2',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  fakeUnleash.toggleDefinitions.push({
    name: 'test-3',
    enabled: true,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  const result = client.getAllToggles({ environment: 'some' });

  expect(result.length).toBe(3);
  client.destroy();
});

test('should return default variant for disabled toggles', () => {
  const config = createProxyConfig({
    unleashApiToken: '123',
    unleashUrl: 'http://localhost:4242/api',
    proxySecrets: ['s1'],
    environment: 'never-change-me',
    logLevel: LogLevel.error,
  });

  const { client } = createFakeClient(config);

  const fakeUnleash = client.unleash as FakeUnleash;

  fakeUnleash.toggleDefinitions.push({
    name: 'test',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  fakeUnleash.toggleDefinitions.push({
    name: 'test-2',
    enabled: false,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  fakeUnleash.toggleDefinitions.push({
    name: 'test-3',
    enabled: true,
    stale: false,
    strategies: [],
    variants: [],
    impressionData: true,
    type: 'experiment',
    project: 'default',
  });

  const result = client.getAllToggles({ environment: 'some' });

  expect(result.length).toBe(3);
  expect(result[0].variant?.name).toBe('disabled');
  expect(result[0].variant?.enabled).toBe(false);
  expect(result[1].variant?.name).toBe('disabled');
  expect(result[1].variant?.enabled).toBe(false);
  expect(result[2].variant?.name).toBe('disabled');
  expect(result[2].variant?.enabled).toBe(false);
  client.destroy();
});

test('should register metrics', () => {
  const config = createProxyConfig({
    unleashApiToken: '123',
    unleashUrl: 'http://localhost:4242/api',
    proxySecrets: ['s1'],
    environment: 'never-change-me',
    logLevel: LogLevel.error,
  });

  const { client, metrics } = createFakeClient(config);

  client.registerMetrics({
    bucket: {
      toggles: {
        toggle: {
          yes: 3,
          no: 1,
          variants: { variantA: 2, variantB: 1, disabled: 1 },
        },
      },
    },
  });

  expect(metrics.recordedCount).toStrictEqual([
    ['toggle', true],
    ['toggle', true],
    ['toggle', true],
    ['toggle', false],
  ]);
  expect(metrics.recordedCountVariant).toStrictEqual([
    ['toggle', 'variantA'],
    ['toggle', 'variantA'],
    ['toggle', 'variantB'],
    ['toggle', 'disabled'],
  ]);
});
