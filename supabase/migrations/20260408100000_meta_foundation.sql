-- Meta Ads Foundation: companies, meta_connections, meta_accounts

-- Helper: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── companies ───────────────────────────────────────────────────────────────
CREATE TABLE companies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  cnpj       TEXT,
  website    TEXT,
  vertical   TEXT,       -- ecommerce | saas | agency | local_business | finance | health | education | other
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_owner" ON companies
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── meta_connections ─────────────────────────────────────────────────────────
CREATE TABLE meta_connections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token   TEXT        NOT NULL,
  token_type     TEXT        NOT NULL DEFAULT 'long_lived',
  meta_user_id   TEXT        NOT NULL,
  meta_user_name TEXT,
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_connections_owner" ON meta_connections
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER meta_connections_updated_at
  BEFORE UPDATE ON meta_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── meta_accounts ────────────────────────────────────────────────────────────
CREATE TABLE meta_accounts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id     TEXT        NOT NULL,  -- format: act_XXXXXXXXX
  account_name   TEXT        NOT NULL,
  currency       TEXT        NOT NULL DEFAULT 'USD',
  account_status INTEGER     NOT NULL DEFAULT 1, -- 1=ACTIVE, 2=DISABLED, 9=IN_GRACE_PERIOD, 101=CLOSED
  is_selected    BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, account_id)
);

ALTER TABLE meta_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_accounts_owner" ON meta_accounts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER meta_accounts_updated_at
  BEFORE UPDATE ON meta_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for fast account lookup
CREATE INDEX meta_accounts_user_idx ON meta_accounts (user_id);
