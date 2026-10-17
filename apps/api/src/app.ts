import express from "express";
import cors from "cors";
import { InMemoryDecisionStore } from "./decisionStore.js";
import { requestLogger } from "./observability.js";
import { createCopilotRouter } from "./routes/copilot.js";
import { importsRouter } from "./routes/imports.js";
import { createShipmentsRouter } from "./routes/shipments.js";
import { rateLimit, tenantGuard } from "./security.js";

export function createApp() {
  const app = express();
  const configuredOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);
  const store = new InMemoryDecisionStore();

  app.use(cors({ origin: configuredOrigins?.length ? configuredOrigins : true }));
  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);
  app.use(tenantGuard());
  app.use(rateLimit());

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "cargoiq-api" }));
  app.use("/api/shipments", createShipmentsRouter(store));
  app.use("/api/imports", importsRouter);
  app.use("/api/copilot", createCopilotRouter(store));

  return app;
}
