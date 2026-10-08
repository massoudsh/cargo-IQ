import express from "express";
import cors from "cors";
import { requestLogger } from "./observability.js";
import { shipmentsRouter } from "./routes/shipments.js";

export function createApp() {
  const app = express();
  const configuredOrigins = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);

  app.use(cors({ origin: configuredOrigins?.length ? configuredOrigins : true }));
  app.use(express.json({ limit: "32kb" }));
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cargoiq-api" });
  });

  app.use("/api/shipments", shipmentsRouter);

  return app;
}
