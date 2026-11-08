package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"geofencing-system/internal/config"
)

func NewPool(ctx context.Context, cfg *config.DatabaseConfig) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	poolConfig.MaxConns = 20
	poolConfig.MinConns = 5
	poolConfig.MaxConnLifetime = time.Hour
	poolConfig.MaxConnIdleTime = 30 * time.Minute
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	slog.Info("Database connected", "host", cfg.Host, "database", cfg.Name)
	return pool, nil
}

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	migrations := []string{
		`CREATE EXTENSION IF NOT EXISTS postgis;`,
		`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

		`CREATE TABLE IF NOT EXISTS geofences (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			name VARCHAR(255) NOT NULL,
			description TEXT,
			boundary GEOMETRY(POLYGON, 4326) NOT NULL,
			category VARCHAR(100) NOT NULL DEFAULT 'general',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		`CREATE INDEX IF NOT EXISTS idx_geofences_boundary ON geofences USING GIST (boundary);`,

		`CREATE TABLE IF NOT EXISTS vehicles (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			vehicle_number VARCHAR(50) NOT NULL UNIQUE,
			driver_name VARCHAR(255) NOT NULL,
			vehicle_type VARCHAR(100) NOT NULL,
			phone VARCHAR(50) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'active',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		`CREATE TABLE IF NOT EXISTS vehicle_locations (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			location GEOMETRY(POINT, 4326) NOT NULL,
			recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		`CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle_id ON vehicle_locations(vehicle_id);`,

		`CREATE TABLE IF NOT EXISTS vehicle_geofence_states (
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
			is_inside BOOLEAN NOT NULL DEFAULT FALSE,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (vehicle_id, geofence_id)
		);`,

		`CREATE TABLE IF NOT EXISTS alert_rules (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
			vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
			event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('entry', 'exit', 'both')),
			status VARCHAR(50) NOT NULL DEFAULT 'active',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		`CREATE INDEX IF NOT EXISTS idx_alert_rules_geofence_id ON alert_rules(geofence_id);`,
		`CREATE INDEX IF NOT EXISTS idx_alert_rules_vehicle_id ON alert_rules(vehicle_id);`,

		`CREATE TABLE IF NOT EXISTS geofence_events (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
			geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
			event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('entry', 'exit')),
			location GEOMETRY(POINT, 4326) NOT NULL,
			occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);`,

		`CREATE INDEX IF NOT EXISTS idx_geofence_events_vehicle_id ON geofence_events(vehicle_id);`,
		`CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence_id ON geofence_events(geofence_id);`,
		`CREATE INDEX IF NOT EXISTS idx_geofence_events_occurred_at ON geofence_events(occurred_at);`,
	}

	for i, migration := range migrations {
		if _, err := pool.Exec(ctx, migration); err != nil {
			return fmt.Errorf("migration %d failed: %w", i+1, err)
		}
	}

	slog.Info("Database migrations completed")
	return nil
}