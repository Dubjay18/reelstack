-- Migration: 004_google_oauth
-- Ensures the password column is named password_hash to match the Go model.
-- This is a no-op if the DB was initialised from 001_init.sql which already
-- uses the correct column name.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_name  = 'users'
        AND    column_name = 'password'
    ) THEN
        ALTER TABLE users RENAME COLUMN password TO password_hash;
        RAISE NOTICE 'Renamed column users.password → users.password_hash';
    ELSE
        RAISE NOTICE 'Column users.password_hash already exists; no action taken.';
    END IF;
END $$;
