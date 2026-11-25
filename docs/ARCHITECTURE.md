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

## Operations console

The web remains a single React page with hash navigation, not a new routing or state-management framework. `AppShell` provides landmarks, responsive disclosure navigation, offline feedback and an OS-default, locally persisted theme. Only the theme is stored locally; operational records remain in the existing API store.

`DecisionWorkspace` derives counts and review queues from successfully loaded tenant history. `DecisionTable` renders ten rows at a time, with UTC date filtering and client-side sorting/search. It does not reduce API payload size; server-side pagination is still needed for large histories. Partner summaries count top-ranked proposals, not carrier performance. The API has no authoritative delay, exception, customer, assignment or on-time-performance model, so those workflows are not simulated.

`decisionReport.ts` exports only the filtered history already received by the current client. CSV includes scope, timestamp and filters, escapes quotes and neutralizes spreadsheet-formula prefixes. There is no additional data-fetch/export endpoint or bypass of API tenant controls. A download handoff is not confirmation that a file was saved.

`theme.css` owns light/dark tokens; `GlassSurface` supplies three surface variants. Only the topbar uses supported backdrop blur; all data surfaces are opaque for readability and cost. Reduced-motion/transparency fallbacks and non-color status labels are included. `ShipmentForm` provides linked inline errors while the API remains authoritative. The shared API helper distinguishes network, permission, validation, rate-limit and server failures without displaying internal server errors.

`npm run check --prefix apps/web` runs lint, typechecking and component/utility/token-contrast tests in the existing CI test path. This is not a browser, screen-reader or visual-regression audit, and no Core Web Vitals claims are made.

## Freight measures and cost tooling

- `apps/api/src/freightMeasures.ts` derives one cargo description into air chargeable kilograms (divisor 6000), LCL revenue tons (weight or measure, whichever is greater) and road loading metres (1 LDM = 1 m of 2.4 m-wide trailer floor). Dimensions take precedence over total cubic volume. These divisors are planning conventions, not the carrier's contract.
- Every ranked option carries a `billing` basis so the UI can show which unit a forwarder would invoice on. Recommendation payloads also include the raw `measures` used.
- `apps/api/src/landedCost.ts` builds a landed-cost view from an owned decision. The Incoterm decides whether freight and insurance are already inside the goods price; those lines are reported as `counted: false` and excluded from the total so nothing is added twice. Duty and VAT rates, declared value and the rial FX rate are user-supplied; defaults are zero or a stated percentage and are surfaced as assumptions.
- RFQ offers are user-recorded only: `POST /api/quotes/:rfqId/offers` accepts a forwarder that belongs to that draft, cost, transit days and optional expiry; `GET` returns a comparison that excludes expired offers from cheapest/fastest/best-value. Nothing is fetched from a forwarder and no offer is validated.
- Document readiness stores a prepared flag per tenant, decision and document code. It records that a team marked a document available; it is not a file upload, an authenticity check or a clearance.
- All new collections are in-memory and tenant-scoped, matching the existing store. They are lost on restart.

## Trip insights

- `apps/api/src/insights.ts` computes emissions, a planned milestone schedule, an HS chapter suggestion, a copy-ready RFQ message and demurrage estimates from an owned decision.
- Emission factors are order-of-magnitude tonnes CO2e per tonne-kilometre per mode. Distance comes from a caller-supplied value, else a small corridor table, else `null`; a lane outside the table returns zero emissions with a note rather than an invented distance. This is not a GLEC/EN 16258 inventory.
- The planned schedule spreads milestones between decision creation and the first option's transit estimate. It is an internal planning aid and never asserts that goods moved.
- The HS suggestion matches cargo keywords to a chapter and heading with an explicit `low` confidence and a verification boundary. Duty rates depend on the exact code.
- The RFQ message is assembled text for the user to copy and send themselves; nothing is transmitted.
- Demurrage uses calendar days and a flat daily rate with an optional container count. Free-time start rules, holidays and tiered tariffs are out of scope.
- `GET /api/insights/:decisionId` and `POST /api/insights/demurrage` are tenant-scoped; the client only loads insights on explicit user action.

## Scale path

Keep the modular monolith until a measured bottleneck appears. Extract candidate data, scoring, and feedback processing independently only when their load or ownership differs. Keep `decisionId`, model/rules version, score breakdown, and input snapshot with every persisted decision so recommendations remain auditable.
