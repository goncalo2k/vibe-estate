-- Properties table: canonical listing data from all providers
CREATE TABLE properties (
    id TEXT PRIMARY KEY,
    external_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    operation TEXT NOT NULL,
    property_type TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    price_period TEXT,
    area_m2 REAL,
    rooms INTEGER,
    bathrooms INTEGER,
    floor TEXT,
    has_elevator INTEGER NOT NULL DEFAULT 0,
    has_parking INTEGER NOT NULL DEFAULT 0,
    has_terrace INTEGER NOT NULL DEFAULT 0,
    energy_rating TEXT,
    condition TEXT,
    latitude REAL,
    longitude REAL,
    district TEXT,
    municipality TEXT,
    parish TEXT,
    address TEXT,
    images TEXT NOT NULL DEFAULT '[]',
    raw_data TEXT,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(provider, external_id)
);

CREATE INDEX idx_properties_operation ON properties(operation);
CREATE INDEX idx_properties_price ON properties(price_cents);
CREATE INDEX idx_properties_district ON properties(district);
CREATE INDEX idx_properties_municipality ON properties(municipality);
CREATE INDEX idx_properties_rooms ON properties(rooms);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_properties_created ON properties(created_at);
CREATE INDEX idx_properties_provider ON properties(provider);

-- Saved search criteria
CREATE TABLE searches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    operation TEXT NOT NULL,
    property_types TEXT,
    min_price_cents INTEGER,
    max_price_cents INTEGER,
    min_area_m2 REAL,
    max_area_m2 REAL,
    min_rooms INTEGER,
    max_rooms INTEGER,
    districts TEXT,
    municipalities TEXT,
    parishes TEXT,
    providers TEXT,
    notify_email TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AI analysis results
CREATE TABLE analyses (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id),
    summary TEXT NOT NULL,
    rating TEXT NOT NULL,
    score INTEGER,
    price_per_m2_cents INTEGER,
    market_avg_price_per_m2_cents INTEGER,
    pros TEXT NOT NULL DEFAULT '[]',
    cons TEXT NOT NULL DEFAULT '[]',
    raw_response TEXT,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(property_id)
);

CREATE INDEX idx_analyses_property ON analyses(property_id);
CREATE INDEX idx_analyses_rating ON analyses(rating);

-- Notification log
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    search_id TEXT NOT NULL REFERENCES searches(id),
    property_id TEXT NOT NULL REFERENCES properties(id),
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(search_id, property_id)
);

CREATE INDEX idx_notifications_search ON notifications(search_id);

-- Scrape run log
CREATE TABLE scrape_runs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    properties_found INTEGER DEFAULT 0,
    properties_new INTEGER DEFAULT 0,
    properties_updated INTEGER DEFAULT 0,
    error_message TEXT
);
