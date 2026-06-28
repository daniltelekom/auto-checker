CREATE TABLE IF NOT EXISTS listing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  price INT,
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_history_url ON listing_history(url);

ALTER TABLE listing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on listing_history"
  ON listing_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on listing_history"
  ON listing_history FOR INSERT
  WITH CHECK (true);
