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

## Scale path

Keep the modular monolith until a measured bottleneck appears. Extract candidate data, scoring, and feedback processing independently only when their load or ownership differs. Keep `decisionId`, model/rules version, score breakdown, and input snapshot with every persisted decision so recommendations remain auditable.
