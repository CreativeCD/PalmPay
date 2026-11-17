-- =============================================================================
-- PalmPay Seed Data
-- Closed-loop simulated merchants for academic capstone demonstration.
-- Run after schema.sql: psql -d palmpay -f database/seed.sql
-- =============================================================================

INSERT INTO merchants (id, name, category, active) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Campus Cafeteria',    'Food & Beverage', true),
  ('a1b2c3d4-0002-0002-0002-000000000002', 'University Bookstore', 'Books & Stationery', true),
  ('a1b2c3d4-0003-0003-0003-000000000003', 'Student QuickMart',    'Convenience & Grocery', true),
  ('a1b2c3d4-0004-0004-0004-000000000004', 'Tech & Print Station', 'Services & Electronics', true),
  ('a1b2c3d4-0005-0005-0005-000000000005', 'Campus Coffee Bar',    'Food & Beverage', true)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      category = EXCLUDED.category,
      active = EXCLUDED.active;
