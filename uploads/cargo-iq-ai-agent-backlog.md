# Cargo IQ — AI Agent UI/UX Backlog

This document contains a ready-to-use backlog for improving **Cargo IQ** with a modern, glassy UI/UX style.

> **Assumption:** The repository contents could not be inspected directly. This backlog assumes **Cargo IQ** is a cargo/logistics intelligence product focused on shipments, tracking, milestones, operational performance, exceptions, partners, and reporting. Before implementation, an AI agent must audit the actual frontend stack, routes, components, data model, roles, and backend capabilities, then adapt terminology and scope.

## How to use

1. Copy each section into a separate GitHub Issue, or let an AI coding agent read this file directly.
2. Implement issues in the recommended order.
3. Keep each pull request small and focused.
4. Preserve existing APIs, data behavior, permissions, integrations, and calculation logic.
5. Adapt terminology to the product’s actual domain: shipments, consignments, bookings, milestones, carriers, forwarders, warehouses, fleets, routes, or customers.

## Recommended implementation order

1. Create a reusable glass UI design system
2. Redesign app shell and navigation
3. Define accessible glass surface recipes
4. Add an operations dashboard
5. Improve shipment visibility and milestone tracking
6. Improve exception and delay management
7. Upgrade shipment search and investigation tables
8. Improve partner, carrier, and route performance views
9. Add reporting and export experience
10. Improve forms, settings, and error handling
11. Improve Persian typography and RTL consistency
12. Add polished light and dark themes
13. Add restrained motion and interaction feedback
14. Meet WCAG AA across primary flows
15. Optimize frontend performance
16. Add quality gates and visual regression checks

## Global rules for AI agents

- Preserve existing functionality, APIs, calculations, permissions, and integrations.
- Prefer the project’s existing frontend framework, styling system, and component conventions.
- Use design tokens instead of hard-coded colors, spacing, radii, shadows, and blur values.
- Support both Persian/RTL and English/LTR where applicable.
- Maintain WCAG AA contrast and keyboard accessibility.
- Add loading, empty, error, offline, and permission-denied states to new UI.
- Avoid excessive backdrop blur; glassmorphism must not harm readability or performance.
- Do not introduce a new state-management, UI, or CSS framework unless clearly necessary.
- Include screenshots or short recordings in pull requests when UI changes are visible.

---

## 1. Create a reusable glass UI design system

**Labels:** `design-system`, `ui/ux`, `glassmorphism`, `frontend`

### Goal

Establish a consistent visual language before changing individual screens.

### Scope

- Add design tokens for:
  - Color
  - Surface and background
  - Blur
  - Border
  - Shadow
  - Radius
  - Spacing
  - Typography
  - Motion
  - Z-index
  - Operational status colors
- Create reusable components:
  - `GlassCard`
  - `GlassPanel`
  - `GlassButton`
  - `GlassIconButton`
  - `GlassInput`
  - `GlassSelect`
  - `GlassDatePicker`
  - `GlassTable`
  - `GlassTabs`
  - `GlassModal`
  - `GlassDrawer`
  - `GlassPopover`
  - `GlassToast`
  - `GlassTooltip`
  - `GlassSidebar`
  - `GlassTopBar`
  - `StatusBadge`
  - `MilestoneIndicator`
  - `DelayBadge`
- Support light and dark themes.
- Support RTL/Persian text.

### Acceptance criteria

- [ ] Tokens are defined in a central theme/configuration file.
- [ ] Components use tokens rather than hard-coded styles.
- [ ] Interactive components include hover, focus-visible, active, disabled, loading, and error states.
- [ ] Status, delay, and milestone colors are consistent and accessible.
- [ ] Components work in RTL and LTR layouts.
- [ ] Existing screens do not regress.

### AI-agent prompt

```text
Audit Cargo IQ’s frontend stack, routing structure, component library, and styling approach. Create a token-based glass design system without breaking existing functionality. Include accessible operational status, milestone, and delay color tokens. Prefer CSS variables or the project’s existing theme mechanism.
```

---

## 2. Redesign app shell and navigation

**Labels:** `ui/ux`, `frontend`, `glassmorphism`

### Goal

Make Cargo IQ feel modern, organized, and efficient for logistics operations teams.

### Requirements

- Responsive application shell.
- Fixed glass sidebar on desktop.
- Collapsible drawer/sidebar on mobile.
- Sticky glass top bar.
- Global search for shipments, customers, partners, routes, and exceptions where supported.
- Notifications for critical operational events.
- User/profile menu.
- Environment indicator, such as production, staging, or sandbox.
- Theme toggle.
- Clear active-route indication.
- Quick links to active shipments, exceptions, and reports.

### Acceptance criteria

- [ ] Sidebar collapses on smaller viewports.
- [ ] Top bar remains usable while scrolling.
- [ ] Active navigation item is visually and programmatically indicated.
- [ ] All navigation is reachable by keyboard.
- [ ] Environment is clearly identifiable to reduce operational mistakes.
- [ ] Layout works correctly in RTL.
- [ ] No business logic is changed.

### AI-agent prompt

```text
Refactor Cargo IQ’s app layout into a responsive operations console with a glass sidebar, sticky top bar, and content area. Preserve existing routes and data behavior. Include a clear environment indicator and ensure navigation works with keyboard, screen readers, and RTL.
```

---

## 3. Define accessible glass surface recipes

**Labels:** `ui/ux`, `glassmorphism`, `accessibility`

### Goal

Avoid unreadable text, inconsistent blur, and inaccessible contrast.

### Surface variants

| Variant | Use case |
|---|---|
| `subtle` | Page background layers, quiet containers |
| `medium` | Cards, panels, filters, forms |
| `elevated` | Modals, drawers, dropdowns, command palette, toasts, popovers |

### Requirements

- Use restrained blur and semi-transparent fills.
- Add a subtle 1px light border for definition.
- Guarantee WCAG AA contrast for text, icons, and interactive controls.
- Provide fallbacks when `backdrop-filter` is unavailable.
- Respect `prefers-reduced-motion`.
- Do not reduce readability of shipment timelines, tables, maps, or reports.

### Acceptance criteria

- [ ] `GlassSurface` component exists with `subtle`, `medium`, and `elevated` variants.
- [ ] Contrast passes WCAG AA in light and dark themes.
- [ ] A no-backdrop-filter fallback is implemented.
- [ ] Focus states are visible on glass surfaces.
- [ ] Long text and data-heavy content remain readable.

### AI-agent prompt

```text
Create a GlassSurface primitive with subtle, medium, and elevated variants. Include hover, focus-visible, disabled, loading, and error states. Add reduced-motion and no-backdrop-filter fallbacks.
```

---

## 4. Add an operations dashboard

**Labels:** `feature`, `ui/ux`, `frontend`

### Goal

Give operations teams an immediate view of shipment health, exceptions, and performance.

### Dashboard content

- KPI cards:
  - Active shipments
  - On-time shipments
  - Delayed shipments
  - Open exceptions
  - Completed deliveries
  - Average transit time, where available
  - Milestone completion rate, where available
- Charts:
  - Shipment volume over time
  - On-time versus delayed performance
  - Exceptions by type, route, partner, or customer
  - Milestone completion trends
  - Delay aging
- Filters:
  - Date range
  - Customer
  - Carrier or partner
  - Route or lane
  - Shipment status
  - Exception type
  - Origin and destination

### Acceptance criteria

- [ ] KPI cards are clickable and navigate to filtered views.
- [ ] Charts have accessible labels, legends, and tooltips.
- [ ] Filters update the dashboard without a full-page reload where practical.
- [ ] Loading skeletons are shown during data fetches.
- [ ] Empty, error, and no-permission states are implemented.
- [ ] Metrics respect user permissions and data scope.

### AI-agent prompt

```text
Add an operations dashboard to Cargo IQ using existing data sources and metrics. If an endpoint does not exist, create clearly typed mock services marked with TODOs. Use glass cards, charts, filters, and accessible empty/loading/error states.
```

---

## 5. Improve shipment visibility and milestone tracking

**Labels:** `feature`, `ux`, `frontend`

### Goal

Make it easy to understand where a shipment is, what has happened, and what should happen next.

### Requirements

- Shipment header with reference number, status, customer, route, carrier/partner, and key dates.
- Visual milestone timeline showing completed, current, upcoming, delayed, and missed milestones.
- Expected versus actual milestone times where available.
- Clear indication of the next expected action and responsible party.
- Related documents, events, notes, and contact information where supported.
- Ability to navigate from a milestone to its underlying events or evidence.
- Clear distinction between planned, estimated, actual, and delayed times.

### Acceptance criteria

- [ ] Users can understand shipment progress at a glance.
- [ ] Milestone states and timestamps are clear.
- [ ] Delays and exceptions are visually prominent but not alarmist.
- [ ] Users can inspect underlying events where data exists.
- [ ] Loading, empty, error, and unauthorized states are implemented.
- [ ] Existing tracking data and permissions are respected.

### AI-agent prompt

```text
Improve Cargo IQ’s shipment visibility and milestone-tracking UX. Create a clear shipment header, milestone timeline, expected-versus-actual comparison, and related-event context using existing data. Preserve all tracking behavior and permissions.
```

---

## 6. Improve exception and delay management

**Labels:** `feature`, `ux`, `frontend`

### Goal

Help operations teams identify, prioritize, resolve, and learn from delays and exceptions.

### Requirements

- Exception list with severity, type, shipment, route, owner, age, and status.
- Exception detail with timeline, affected shipment, likely cause, and recommended next step where available.
- Assignment, acknowledgment, escalation, resolution, and reopening actions based on permissions.
- Require a reason or resolution note for consequential actions.
- Show related alerts, messages, documents, and shipment context.
- Provide filters for open, overdue, critical, assigned, and unresolved exceptions.
- Preserve an audit trail for every action.

### Acceptance criteria

- [ ] Users can prioritize exceptions effectively.
- [ ] Exception ownership and status are clear.
- [ ] Users can understand the operational impact and history.
- [ ] Actions are permission-aware and confirmed where appropriate.
- [ ] Every action is recorded in the existing audit mechanism.
- [ ] Loading, empty, error, and unauthorized states are implemented.

### AI-agent prompt

```text
Improve Cargo IQ’s exception and delay-management workflow. Create clear exception lists, detail views, assignment and resolution flows, and audit-friendly actions. Preserve all operational and audit behavior.
```

---

## 7. Upgrade shipment search and investigation tables

**Labels:** `ui/ux`, `performance`, `frontend`

### Goal

Make large volumes of shipments, milestones, and exceptions fast to search and investigate.

### Requirements

- Sticky headers.
- Column sorting.
- Advanced filtering by date, status, customer, carrier, route, exception type, milestone, and owner.
- Saved filters or operational queue views where supported.
- Pagination or virtualization for large datasets.
- CSV or Excel export only when authorized and safe.
- Numeric alignment and localized number/date formatting.
- Bulk actions with confirmation and permission checks.
- Loading skeletons.
- Mobile-friendly behavior through responsive columns or a detail drawer.

### Acceptance criteria

- [ ] A reusable data-table component exists.
- [ ] Large datasets remain responsive.
- [ ] Filters and exports do not block the UI.
- [ ] Bulk actions are permission-aware and confirmed.
- [ ] Persian and English number/date formats are handled correctly.
- [ ] Empty and error states are implemented.

### AI-agent prompt

```text
Audit Cargo IQ’s shipment and exception tables. Implement a reusable high-performance data table with filtering, sorting, bulk actions, and export only where the backend and permissions support them. Use virtualization only if justified by dataset size or existing dependencies.
```

---

## 8. Improve partner, carrier, and route performance views

**Labels:** `feature`, `ux`, `frontend`

### Goal

Make operational performance comparable and actionable across partners, carriers, routes, and customers.

### Requirements

- Performance list with on-time rate, delay rate, average transit time, exception rate, and shipment volume where available.
- Trend indicators and comparison against selected baseline or period.
- Drill-down from a performance metric to the underlying shipments or exceptions.
- Filters for date range, lane, service level, partner, and customer.
- Clear definitions and tooltips for each metric.
- Avoid presenting incomplete data as definitive performance.

### Acceptance criteria

- [ ] Users can compare performance across relevant dimensions.
- [ ] Metric definitions are understandable.
- [ ] Users can drill down from a metric to its source records.
- [ ] Data limitations and empty states are communicated clearly.
- [ ] Existing calculations and data permissions are preserved.

### AI-agent prompt

```text
Improve Cargo IQ’s partner, carrier, route, and customer performance views. Use existing metrics and calculations only. Add clear metric definitions, trends, filters, and drill-down navigation to underlying shipments or exceptions.
```

---

## 9. Add reporting and export experience

**Labels:** `feature`, `ux`, `frontend`

### Goal

Help users turn operational data into shareable, understandable reports.

### Requirements

- Report builder or prebuilt report views using existing data and metrics.
- Filters for date range, customer, partner, route, status, and exception type.
- Clear preview before export.
- CSV, Excel, or PDF export only where the backend and permissions support it.
- Show export progress, success, failure, and retry states.
- Include report title, generated time, applied filters, and data scope in exports where practical.
- Prevent export of data outside the user’s authorized scope.

### Acceptance criteria

- [ ] Users can configure and preview a report.
- [ ] Export states are clear and non-blocking.
- [ ] Exports respect permissions and data scope.
- [ ] Reports include enough context to be interpretable.
- [ ] Empty, error, and unauthorized states are implemented.

### AI-agent prompt

```text
Improve Cargo IQ’s reporting and export experience using existing reports and data endpoints. Do not create new backend analytics capabilities. Add clear filters, preview, export states, permission checks, and accessible empty/error states.
```

---

## 10. Make forms, settings, and errors actionable

**Labels:** `ux`, `frontend`, `accessibility`

### Goal

Help users configure shipments, partners, routes, notifications, and preferences confidently.

### Requirements

- Inline field-level validation.
- Summary of validation failures at the top of long forms.
- Links from summary items to the relevant fields.
- Distinct handling for validation errors, permission errors, network errors, and system failures.
- Preserve user input after an error.
- Clear save, saving, saved, unsaved-changes, and discard states.
- Group related settings and use progressive disclosure for advanced options.
- Require confirmation for high-impact configuration changes.

### Acceptance criteria

- [ ] A shared error-message catalog exists.
- [ ] Error messages are specific and actionable.
- [ ] Users can recover from failed submissions without losing input.
- [ ] High-impact settings changes are confirmed.
- [ ] Errors are announced accessibly.
- [ ] Persian and English messages are available.

### AI-agent prompt

```text
Standardize Cargo IQ’s form, settings, and API error handling. Create a shared error-message catalog and ensure validation failures are visible, specific, and recoverable. Add confirmation for high-impact configuration actions.
```

---

## 11. Improve Persian typography and RTL consistency

**Labels:** `i18n`, `ui/ux`, `accessibility`

### Goal

Make the Persian-first experience feel native and polished.

### Requirements

- Use a high-quality Persian font with sensible fallbacks.
- Set correct `dir`, alignment, punctuation, numerals, and mixed Persian/English handling.
- Test dashboards, shipment timelines, tables, forms, maps, modals, toasts, and reports in RTL.
- Avoid mirroring direction-sensitive icons.
- Prevent clipping or overflow with longer Persian labels.
- Handle shipment IDs, tracking numbers, addresses, emails, URLs, and technical values correctly in bidirectional text.

### Acceptance criteria

- [ ] All primary screens render correctly in RTL.
- [ ] Mixed Persian/English content is readable.
- [ ] Icons with directional meaning are not incorrectly mirrored.
- [ ] No major text overflow or clipping.
- [ ] Typography hierarchy is consistent.

### AI-agent prompt

```text
Audit every Cargo IQ screen for RTL and Persian typography issues. Fix layout mirroring, icon direction, number formatting, bidirectional text handling, and overflow. Add visual regression checks if the project has a testing setup.
```

---

## 12. Add polished light and dark themes

**Labels:** `ui/ux`, `glassmorphism`, `frontend`

### Goal

Provide a premium dark experience without losing readability during operational monitoring.

### Requirements

- Theme toggle persisted in user preferences.
- Default to the operating-system preference.
- Use tokens rather than hard-coded colors.
- Tune glass opacity, blur, borders, and shadows separately per theme.
- Ensure charts, tables, maps, badges, timelines, and status indicators remain legible.

### Acceptance criteria

- [ ] Users can switch between light and dark themes.
- [ ] Theme preference persists across sessions.
- [ ] All major screens are verified in both themes.
- [ ] Hard-coded colors are replaced with tokens.
- [ ] Glass surfaces remain readable in dark mode.

### AI-agent prompt

```text
Implement theme tokens and a persisted light/dark toggle for Cargo IQ. Refactor hard-coded colors into tokens. Verify dashboards, shipments, exceptions, tables, maps, and settings in both themes.
```

---

## 13. Add restrained motion and interaction feedback

**Labels:** `ui/ux`, `glassmorphism`, `accessibility`

### Goal

Make the interface feel responsive without distracting operations teams.

### Requirements

- Subtle transitions for page changes, drawers, modals, toasts, popovers, and hover states.
- UI feedback animations should generally be 200–300ms or less.
- Loading skeletons.
- Success and error toasts.
- Optimistic updates only where safe.
- Respect `prefers-reduced-motion`.

### Acceptance criteria

- [ ] Motion tokens are centralized.
- [ ] Interactive components have consistent transitions.
- [ ] Reduced-motion users receive a non-animated equivalent.
- [ ] Animations do not delay comprehension of shipment or exception status.
- [ ] No excessive or decorative animation is added.

### AI-agent prompt

```text
Add a motion token set and apply consistent transitions to Cargo IQ’s interactive components. Ensure reduced-motion users get a non-animated equivalent.
```

---

## 14. Meet WCAG AA across primary flows

**Labels:** `accessibility`, `ui/ux`

### Goal

Ensure the redesigned console is usable by everyone.

### Requirements

- Visible focus rings on all interactive elements.
- Keyboard-only operation for navigation, tables, filters, forms, modals, drawers, and shipment actions.
- Semantic HTML, landmarks, labels, and ARIA only where necessary.
- WCAG AA contrast, including text over glass surfaces.
- Screen-reader testing for shipment tracking and exception management.
- Do not rely on color alone to communicate delay, milestone, or exception status.

### Acceptance criteria

- [ ] All interactive controls are keyboard accessible.
- [ ] Focus is visible and logically managed.
- [ ] Modals, drawers, and popovers manage focus appropriately.
- [ ] Status and severity are conveyed with text or icons as well as color.
- [ ] Primary flows pass WCAG AA checks.

### AI-agent prompt

```text
Run an accessibility review of Cargo IQ’s primary pages and flows. Fix issues without changing backend behavior. Prioritize keyboard navigation, focus management, contrast, semantic structure, and non-color-dependent status indicators.
```

---

## 15. Optimize frontend performance

**Labels:** `performance`, `frontend`

### Goal

Keep the glass UI fast for shipment-heavy and map-heavy logistics workflows.

### Requirements

- Avoid excessive nested backdrop filters and large blur radii.
- Lazy-load routes, maps, charts, timelines, and heavy components.
- Virtualize long shipment, event, or exception lists only where justified.
- Memoize expensive table, chart, and route calculations where appropriate.
- Add skeleton loaders and avoid layout shift.
- Measure Core Web Vitals before and after changes.

### Acceptance criteria

- [ ] Heavy routes and components are code-split or lazy-loaded where appropriate.
- [ ] Glass effects do not cause severe scroll or interaction jank.
- [ ] Large shipment and exception tables remain responsive.
- [ ] Maps and charts do not block initial page interaction.
- [ ] Layout shift is minimized.
- [ ] Before/after performance metrics are documented.
- [ ] No functional regressions are introduced.

### AI-agent prompt

```text
Profile Cargo IQ’s heaviest pages and interaction flows. Identify render, bundle, map, chart, table, and blur-performance bottlenecks, then optimize without changing functionality. Document before/after metrics in the pull request.
```

---

## 16. Add quality gates and visual regression checks

**Labels:** `testing`, `ui/ux`, `frontend`

### Goal

Prevent UI regressions as the glass redesign evolves.

### Requirements

- Add or improve linting, type checking, formatting, and test checks.
- Add unit tests for reusable UI components where a test setup exists.
- Add visual regression coverage for light/dark and RTL/LTR states where practical.
- Test primary flows: dashboard, shipment tracking, exceptions, tables, reports, and settings.
- Document how contributors should run checks locally.

### Acceptance criteria

- [ ] Contributors can run quality checks with a single documented command where practical.
- [ ] Core reusable components have tests or documented manual test steps.
- [ ] Visual checks cover RTL and dark mode where tooling exists.
- [ ] CI fails on meaningful UI, type, lint, or accessibility regressions.
- [ ] Documentation explains the testing workflow.

### AI-agent prompt

```text
Audit Cargo IQ’s existing test and CI setup. Add pragmatic quality gates for UI changes without over-engineering the project. Prioritize type checks, linting, component tests, and visual checks for RTL and dark mode where infrastructure already exists.
```
