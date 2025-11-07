-- Migration: convert shows.date from VARCHAR to DATE and normalise settings concert_date

-- 1. Add a temporary DATE column
ALTER TABLE shows ADD COLUMN date_iso DATE;

-- 2. Populate the new column using best-effort parsing of existing string formats
UPDATE shows
SET date_iso = CASE
    WHEN date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN date::DATE
    WHEN date ~ '^[0-9]{1,2}/[0-9]{1,2}[[:space:]]+[0-9]{4}$'
        THEN TO_DATE(REGEXP_REPLACE(date, '[[:space:]]+', '/'), 'DD/MM/YYYY')
    WHEN date ~ '^[0-9]{1,2}/[0-9]{1,2}[[:space:]]+[0-9]{2}$'
        THEN TO_DATE(REGEXP_REPLACE(date, '[[:space:]]+', '/'), 'DD/MM/YY')
    ELSE NULL
END;

-- 3. Fallback: ensure no NULLs remain (default to current date if parsing failed)
UPDATE shows
SET date_iso = CURRENT_DATE
WHERE date_iso IS NULL;

-- 4. Swap columns
ALTER TABLE shows DROP COLUMN date;
ALTER TABLE shows RENAME COLUMN date_iso TO date;

-- 5. Enforce NOT NULL constraint
ALTER TABLE shows ALTER COLUMN date SET NOT NULL;

-- 6. Normalise concert_date setting to ISO format (yyyy-MM-dd)
UPDATE settings
SET value = TO_CHAR(
    CASE
        WHEN value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN value::DATE
        WHEN value ~ '^[0-9]{1,2}/[0-9]{1,2}[[:space:]]+[0-9]{4}$'
            THEN TO_DATE(REGEXP_REPLACE(value, '[[:space:]]+', '/'), 'DD/MM/YYYY')
        WHEN value ~ '^[0-9]{1,2}/[0-9]{1,2}[[:space:]]+[0-9]{2}$'
            THEN TO_DATE(REGEXP_REPLACE(value, '[[:space:]]+', '/'), 'DD/MM/YY')
        ELSE CURRENT_DATE
    END,
    'YYYY-MM-DD'
)
WHERE key = 'concert_date';


