/**
 * OpenTelemetry SDK bootstrap.
 *
 * IMPORTANT: This module MUST be imported before any other application module
 * so that auto-instrumentation patches are applied before the instrumented
 * libraries (express, http, @prisma/client) are loaded.
 *
 * Configured via environment variables (12-factor friendly):
 *   OTEL_EXPORTER_OTLP_ENDPOINT  — e.g. http://localhost:4318  (default)
 *   OTEL_SERVICE_NAME             — e.g. conduit-api
 *   OTEL_SERVICE_VERSION          — e.g. 1.0.0
 *   OTEL_RESOURCE_ATTRIBUTES      — key=value pairs
 *
 * Signals exported:
 *   • Traces  → OTLP HTTP (/v1/traces)
 *   • Metrics → OTLP HTTP (/v1/metrics), push interval 15 s
 *   • Logs    → OTLP HTTP (/v1/logs)
 *
 * Auto-instrumented libraries:
 *   • express (HTTP server spans)
 *   • http / https (outgoing requests)
 *   • @prisma/client (database spans via @opentelemetry/instrumentation-prisma if available)
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import logger from './logger';

const resource = Resource.default().merge(
  new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'conduit-api',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION ?? '0.0.0',
  }),
);

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';

const traceExporter = new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` });
const metricExporter = new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` });
const logExporter = new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` });

export const sdk = new NodeSDK({
  resource,
  traceExporter,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15_000,
  }) as any,
  logRecordProcessor: new BatchLogRecordProcessor(logExporter),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation — too noisy
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

/**
 * Start the SDK synchronously. Must be called before any instrumented import.
 * Errors are caught so a misconfigured collector does not crash the process.
 */
export function startTelemetry(): void {
  try {
    sdk.start();
  } catch (error) {
    // Do not crash on telemetry misconfiguration — degrade gracefully
    logger.warn({ error }, '[telemetry] SDK failed to start');
  }
}

/**
 * Flush all pending spans / metrics / logs and shut down the SDK.
 * Call on SIGTERM / SIGINT before the process exits.
 */
export async function stopTelemetry(): Promise<void> {
  try {
    await sdk.shutdown();
  } catch (error) {
    logger.warn({ error }, '[telemetry] SDK failed to shut down cleanly');
  }
}
