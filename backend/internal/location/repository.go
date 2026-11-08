package location

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) SaveLocation(ctx context.Context, vehicleID uuid.UUID, longitude, latitude float64) (*VehicleLocation, error) {
	query := `
		INSERT INTO vehicle_locations (vehicle_id, location)
		VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326))
		RETURNING id, recorded_at
	`
	var loc VehicleLocation
	loc.VehicleID = vehicleID
	loc.Longitude = longitude
	loc.Latitude = latitude
	err := r.pool.QueryRow(ctx, query, vehicleID, longitude, latitude).
		Scan(&loc.ID, &loc.RecordedAt)
	return &loc, err
}

func (r *Repository) GetCurrentLocation(ctx context.Context, vehicleID uuid.UUID) (*VehicleLocation, error) {
	query := `
		SELECT id, vehicle_id, ST_AsText(location), recorded_at
		FROM vehicle_locations
		WHERE vehicle_id = $1
		ORDER BY recorded_at DESC
		LIMIT 1
	`
	var loc VehicleLocation
	err := r.pool.QueryRow(ctx, query, vehicleID).Scan(
		&loc.ID, &loc.VehicleID, &loc.Location, &loc.RecordedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &loc, err
}

func (r *Repository) GetGeofenceStates(ctx context.Context, vehicleID uuid.UUID) (map[uuid.UUID]bool, error) {
	query := `
		SELECT geofence_id, is_inside
		FROM vehicle_geofence_states
		WHERE vehicle_id = $1
	`
	rows, err := r.pool.Query(ctx, query, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	states := make(map[uuid.UUID]bool)
	for rows.Next() {
		var geofenceID uuid.UUID
		var isInside bool
		if err := rows.Scan(&geofenceID, &isInside); err != nil {
			return nil, err
		}
		states[geofenceID] = isInside
	}
	return states, rows.Err()
}

func (r *Repository) UpdateGeofenceStates(ctx context.Context, vehicleID uuid.UUID, currentGeofences map[uuid.UUID]bool) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for geofenceID, isInside := range currentGeofences {
		query := `
			INSERT INTO vehicle_geofence_states (vehicle_id, geofence_id, is_inside, updated_at)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (vehicle_id, geofence_id) DO UPDATE SET
				is_inside = EXCLUDED.is_inside,
				updated_at = NOW()
		`
		if _, err := tx.Exec(ctx, query, vehicleID, geofenceID, isInside); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) SaveEvents(ctx context.Context, events []GeofenceEvent) error {
	if len(events) == 0 {
		return nil
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO geofence_events (vehicle_id, geofence_id, event_type, location)
		VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
	`
	for _, e := range events {
		if _, err := tx.Exec(ctx, query, e.VehicleID, e.GeofenceID, e.EventType, e.Longitude, e.Latitude); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetLocationHistory(ctx context.Context, vehicleID uuid.UUID, limit, offset int) ([]*VehicleLocation, int, error) {
	countQuery := `SELECT COUNT(*) FROM vehicle_locations WHERE vehicle_id = $1`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, vehicleID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, vehicle_id, ST_AsText(location), recorded_at
		FROM vehicle_locations
		WHERE vehicle_id = $1
		ORDER BY recorded_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, vehicleID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var locations []*VehicleLocation
	for rows.Next() {
		var loc VehicleLocation
		if err := rows.Scan(&loc.ID, &loc.VehicleID, &loc.Location, &loc.RecordedAt); err != nil {
			return nil, 0, err
		}
		locations = append(locations, &loc)
	}
	return locations, total, rows.Err()
}