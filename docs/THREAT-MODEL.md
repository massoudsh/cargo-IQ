# CargoIQ Threat Model

## Assets

- Shipment origin, destination, cargo type, weight, and volume.
- Forwarder rates, reliability history, and recommendation outcomes.
- Organization identity and future tenant data.

## Threats and controls

| Threat | Control |
|---|---|
| Malformed or extreme request body | API schema validation and body-size limit |
| Cross-origin abuse | Explicit production CORS origin configuration |
| Credential or personal data leakage | `.env` ignored, gitleaks CI, structured logs exclude bodies |
| Recommendation tampering | Persist decision metadata and protect future admin APIs with authentication |
| Automated abuse or cost exhaustion | Edge/API rate limiting before public exposure |
| Unsafe agent action | Typed tools, policy gate, audit trail, and human approval |
| Dependency compromise | Dependabot, lockfiles, CodeQL, SBOM, and review-required updates |

## Operational feature boundaries

- RFQs, tracking records, history and imported rates must not cross tenants. Tests exercise reads and writes under a different key.
- Tracking is manually asserted, not carrier-verified. Stage order prevents regressions and duplicate completion, but does not establish that goods moved.
- A local RFQ is not a sent request, booking or received offer. The UI explicitly discloses this distinction.
- Rate review dates are internal reminders, not promises from a carrier. Expired recommendations cannot create RFQ drafts.
- Packaging input is bounded and validated, including positive complete dimensions and integer package counts.
- Customs keyword checks are conservative prompts for a broker review, not a dangerous-goods classifier or legal clearance.

## Current gaps

Optional API-key authentication, per-tenant access controls and application rate limiting are implemented, but production still needs stable tenant identity mapping, user-level authorization, durable storage and provider integrations. Without configured API keys, the development tenant is shared. Treat the current API as an internal MVP, not an unrestricted public endpoint.

## Security acceptance criteria

- No secrets are committed or printed in CI.
- Invalid requests receive a deterministic 400 response.
- Logs contain request ID, method, path, status, and duration but not request bodies.
- Every future external action requires an authenticated principal and explicit policy decision.
