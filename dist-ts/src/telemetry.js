"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopTelemetry = exports.startTelemetry = exports.sdk = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const resource = resources_1.Resource.default().merge(new resources_1.Resource({
    [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'conduit-api',
    [semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION ?? '0.0.0',
}));
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` });
const metricExporter = new exporter_metrics_otlp_http_1.OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` });
const logExporter = new exporter_logs_otlp_http_1.OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` });
exports.sdk = new sdk_node_1.NodeSDK({
    resource,
    traceExporter,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metricReader: new sdk_metrics_1.PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 15000,
    }),
    logRecordProcessor: new sdk_logs_1.BatchLogRecordProcessor(logExporter),
    instrumentations: [
        (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
            // Disable fs instrumentation — too noisy
            '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
    ],
});
/**
 * Start the SDK synchronously. Must be called before any instrumented import.
 * Errors are caught so a misconfigured collector does not crash the process.
 */
function startTelemetry() {
    try {
        exports.sdk.start();
    }
    catch (error) {
        // Do not crash on telemetry misconfiguration — degrade gracefully
        console.warn('[telemetry] SDK failed to start:', error);
    }
}
exports.startTelemetry = startTelemetry;
/**
 * Flush all pending spans / metrics / logs and shut down the SDK.
 * Call on SIGTERM / SIGINT before the process exits.
 */
async function stopTelemetry() {
    try {
        await exports.sdk.shutdown();
    }
    catch (error) {
        console.warn('[telemetry] SDK failed to shut down cleanly:', error);
    }
}
exports.stopTelemetry = stopTelemetry;
//# sourceMappingURL=telemetry.js.map