-- Initial Schema for ChatGraph

CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender_name TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    message_content TEXT,
    is_media BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (chat_id) REFERENCES chats(id)
);

-- Create FTS5 Virtual Table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    sender_name,
    message_content,
    content='messages',
    content_rowid='id'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages
BEGIN
    INSERT INTO messages_fts (rowid, sender_name, message_content)
    VALUES (new.id, new.sender_name, new.message_content);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages
BEGIN
    INSERT INTO messages_fts (messages_fts, rowid, sender_name, message_content)
    VALUES ('delete', old.id, old.sender_name, old.message_content);
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages
BEGIN
    INSERT INTO messages_fts (messages_fts, rowid, sender_name, message_content)
    VALUES ('delete', old.id, old.sender_name, old.message_content);
    INSERT INTO messages_fts (rowid, sender_name, message_content)
    VALUES (new.id, new.sender_name, new.message_content);
END;
