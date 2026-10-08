import { startTelemetry } from "./observability.js";

await startTelemetry();

const { createApp } = await import("./app.js");
const PORT = process.env.PORT ?? 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`CargoIQ API listening on port ${PORT}`);
});
