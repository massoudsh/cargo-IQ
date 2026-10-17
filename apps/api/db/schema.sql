CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo_type TEXT NOT NULL,
  weight_kg NUMERIC,
  volume_cbm NUMERIC,
  priority TEXT NOT NULL CHECK (priority IN ('cost', 'time', 'balanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recommendations (
  decision_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  shipment_id UUID REFERENCES shipments(id),
  model_version TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  feature_snapshot JSONB NOT NULL,
  score_breakdown JSONB NOT NULL,
  constraints_applied JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recommendation_feedback (
  id UUID PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES recommendations(decision_id),
  accepted BOOLEAN NOT NULL,
  reason TEXT,
  actual_cost_usd NUMERIC,
  actual_delivery_days NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX recommendations_org_created_idx ON recommendations (organization_id, created_at DESC);
CREATE INDEX recommendation_feedback_decision_idx ON recommendation_feedback (decision_id);
