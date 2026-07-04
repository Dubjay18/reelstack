-- Migration: 011_drop_queue_jobs
-- Drops the old Postgres-backed queue_jobs table (replaced by RabbitMQ).

DROP TABLE IF EXISTS queue_jobs;
