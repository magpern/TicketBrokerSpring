-- Remove audit_logs table (audit logs are now stored in log files only)
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP TABLE IF EXISTS audit_logs;

