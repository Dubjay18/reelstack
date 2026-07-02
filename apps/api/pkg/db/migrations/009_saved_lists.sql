CREATE TABLE IF NOT EXISTS saved_lists (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id    UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, list_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_lists_user_id ON saved_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lists_list_id ON saved_lists(list_id);
