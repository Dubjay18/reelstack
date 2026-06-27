-- Migration: 005_notifications
-- Creates the notifications table for follows and list activity

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Recipient of the notification
    actor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- User triggering the notification
    type        VARCHAR(50) NOT NULL,                                  -- 'new_follower', 'list_created'
    entity_id   UUID,                                                  -- References lists(id) or follows relation details
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
