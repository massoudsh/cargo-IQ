import express from "express";
import cors from "cors";
import { shipmentsRouter } from "./routes/shipments.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "cargoiq-api" });
  });

  app.use("/api/shipments", shipmentsRouter);

  return app;
}
