CREATE TABLE IF NOT EXISTS tournaments (
 id TEXT PRIMARY KEY NOT NULL,
 data TEXT NOT NULL,
 revision INTEGER DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_attempts (
 bucket TEXT PRIMARY KEY NOT NULL,
 attempts INTEGER NOT NULL,
 expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_attempts_expiry ON auth_attempts(expires);
