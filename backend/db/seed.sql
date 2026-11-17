-- =============================================================================
-- PalmPay Seed Data
-- These are SIMULATED merchants for the academic capstone demo.
-- No real commercial entity is implied.
-- Run after schema.sql: psql -d palmpay -f seed.sql
-- =============================================================================

INSERT INTO merchants (id, name, category, active) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Campus Coffee',      'Food & Beverage', true),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'TechBooks Store',    'Books & Education', true),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'QuickMart Grocery',  'Grocery', true),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'Gadget Hub',         'Electronics', true),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'Sunrise Restaurant', 'Food & Beverage', true)
ON CONFLICT (id) DO NOTHING;
