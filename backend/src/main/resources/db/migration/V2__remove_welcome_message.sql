-- Remove welcome_message setting from database
-- Welcome message is now localized as "Welcome to [concert name]"
DELETE FROM settings WHERE key = 'welcome_message';

