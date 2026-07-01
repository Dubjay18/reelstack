-- Migration: 006_queue
-- Creates the job queue table for async notification processing

CREATE TABLE IF NOT EXISTS queue_jobs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type         VARCHAR(100) NOT NULL,
    payload      JSONB NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority     INT NOT NULL DEFAULT 0,
    max_retries  INT NOT NULL DEFAULT 3,
    retry_count  INT NOT NULL DEFAULT 0,
    last_error   TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_jobs_pending
    ON queue_jobs (status, scheduled_for, priority)
    WHERE status = 'pending';
