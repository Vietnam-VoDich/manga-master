-- Run once to create tables locally
-- Railway will auto-run this if you set it as the init script

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    clerk_id VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    is_subscribed BOOLEAN DEFAULT FALSE,
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mangas (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    title VARCHAR,
    title_jp VARCHAR,
    tagline VARCHAR,
    subject_name VARCHAR,
    subject_description TEXT,
    photo_url VARCHAR,
    status VARCHAR DEFAULT 'pending',
    pages JSONB DEFAULT '[]',
    audio_theme_url VARCHAR,
    is_preview BOOLEAN DEFAULT TRUE,
    model_used VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mangas_user_id ON mangas(user_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
