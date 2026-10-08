import { randomUUID } from "node:crypto";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import type { RequestHandler } from "express";

let telemetrySdk: NodeSDK | undefined;

export async function startTelemetry() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return;

  telemetrySdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "cargoiq-api",
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  telemetrySdk.start();

  const shutdown = async () => {
    await telemetrySdk?.shutdown();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = req.header("x-request-id") || randomUUID();
  const startedAt = process.hrtime.bigint();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        event: "http.request",
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      }),
    );
  });

  next();
};
