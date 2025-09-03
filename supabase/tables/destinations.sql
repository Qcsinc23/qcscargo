CREATE TABLE destinations (
    id SERIAL PRIMARY KEY,
    country_name TEXT NOT NULL,
    city_name TEXT NOT NULL,
    airport_code TEXT,
    rate_per_lb_1_50 DECIMAL(10,2) NOT NULL,
    rate_per_lb_51_100 DECIMAL(10,2) NOT NULL,
    rate_per_lb_101_200 DECIMAL(10,2) NOT NULL,
    rate_per_lb_201_plus DECIMAL(10,2) NOT NULL,
    transit_days_min INTEGER NOT NULL,
    transit_days_max INTEGER NOT NULL,
    express_surcharge_percent DECIMAL(5,2) DEFAULT 25.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);