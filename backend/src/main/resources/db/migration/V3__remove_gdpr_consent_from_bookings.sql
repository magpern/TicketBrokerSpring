-- Remove unused gdpr_consent column from bookings table
ALTER TABLE bookings DROP COLUMN IF EXISTS gdpr_consent;

