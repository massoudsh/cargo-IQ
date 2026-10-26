# CargoIQ Architecture

## System boundary

CargoIQ is a modular MVP with a React client and an Express API. The API owns request validation and shipment recommendation; the client only collects input and renders the returned decision.

```text
User
  │
  ▼
React/Vite web
  │ POST /api/shipments/recommend
  ▼
Express API
  ├── request logger + request ID
  ├── shipment request validation
  └── decision engine
        ├── candidate route data (current in-memory baseline)
        ├── priority weights
        ├── cost/time/risk normalization
        └── ranked top-three options
```

## Runtime components

- `apps/web/src/App.tsx`: UI state, request lifecycle, and user-facing errors.
- `apps/web/src/components/ShipmentForm.tsx`: shipment input form.
- `apps/web/src/components/ShipmentResults.tsx`: ranked option cards.
- `apps/api/src/app.ts`: Express composition root, middleware, and routes.
- `apps/api/src/routes/shipments.ts`: boundary validation and response contract.
- `apps/api/src/decisionEngine.ts`: deterministic baseline scoring.
- `apps/api/src/observability.ts`: structured request logs and correlation IDs.

## Deployment shape

The current system is suitable for one API process and one static web bundle. A production deployment should place TLS and rate limiting at the edge, run the API as a stateless process, and move route data into a versioned database-backed provider before adding horizontal scaling.

## Data flow and trust boundaries

1. Browser input is untrusted and is validated at the API boundary.
2. The API computes a recommendation from trusted application data.
3. The response is JSON; no user input is rendered as HTML.
4. Logs contain request metadata only and must not contain credentials or raw secrets.

## Operational tools

- `apps/api/src/types.ts` is the API contract source; the web imports only types through `apps/web/src/types.ts`.
- Recommendations expose `estimateReviewAt` (an internal seven-day review reminder, not commercial quote validity) and air-only `chargeableWeightKg`. Dimensions in centimetres take precedence over total cubic volume; the illustrative divisor is 6000. Baseline prices are not weight-rated.
- RFQ routes validate selected forwarders against the owned decision, reject stale estimates and store only local drafts. Expiry is derived on reads. No external delivery is attempted.
- Tracking routes create owned internal records with a single registration event. Explicit manual confirmation advances one milestone at a time; unknown IDs return 404. There is no simulated carrier feed or fabricated ETA.
- Customs checks use the selected shipment, return preparation guidance and retain a review status when keywords do not match; they never grant clearance.
- Imports are tenant-scoped. Ranking uses one deduplicated candidate collection, and the client preserves server ranking rather than sorting it again.

All operational collections remain in memory. PostgreSQL schema is not an active persistence adapter; production still needs stable identity mapping, durable repositories and carrier/forwarder integrations.

## Scale path

Keep the modular monolith until a measured bottleneck appears. Extract candidate data, scoring, and feedback processing independently only when their load or ownership differs. Keep `decisionId`, model/rules version, score breakdown, and input snapshot with every persisted decision so recommendations remain auditable.
