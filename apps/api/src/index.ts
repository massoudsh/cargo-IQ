import express from "express";
import cors from "cors";
import { shipmentsRouter } from "./routes/shipments.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "cargoiq-api" });
});

app.use("/api/shipments", shipmentsRouter);

app.listen(PORT, () => {
  console.log(`CargoIQ API listening on port ${PORT}`);
});
