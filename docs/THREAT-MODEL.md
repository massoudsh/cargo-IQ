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

## Current gaps

Authentication, tenant isolation, durable storage, rate limiting, and provider integrations are not implemented yet. The current API should be treated as an internal MVP, not an unrestricted public endpoint.

## Security acceptance criteria

- No secrets are committed or printed in CI.
- Invalid requests receive a deterministic 400 response.
- Logs contain request ID, method, path, status, and duration but not request bodies.
- Every future external action requires an authenticated principal and explicit policy decision.
