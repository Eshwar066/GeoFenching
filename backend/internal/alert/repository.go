package alert

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, a *AlertRule) error {
	query := `
		INSERT INTO alert_rules (geofence_id, vehicle_id, event_type, status)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	var vehicleID any = nil
	if a.VehicleID != nil {
		vehicleID = *a.VehicleID
	}
	err := r.pool.QueryRow(ctx, query, a.GeofenceID, vehicleID, a.EventType, a.Status).
		Scan(&a.ID, &a.CreatedAt)
	return err
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]*AlertRule, int, error) {
	countQuery := `SELECT COUNT(*) FROM alert_rules WHERE status = 'active'`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, geofence_id, vehicle_id, event_type, status, created_at
		FROM alert_rules
		WHERE status = 'active'
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var rules []*AlertRule
	for rows.Next() {
		var a AlertRule
		var vehicleID pgtype.UUID
		if err := rows.Scan(&a.ID, &a.GeofenceID, &vehicleID, &a.EventType, &a.Status, &a.CreatedAt); err != nil {
			return nil, 0, err
		}
		if vehicleID.Valid {
			vid := uuid.UUID(vehicleID.Bytes)
			a.VehicleID = &vid
		}
		rules = append(rules, &a)
	}
	return rules, total, rows.Err()
}

func (r *Repository) GetMatchingRules(ctx context.Context, geofenceID uuid.UUID, vehicleID uuid.UUID, eventType string) ([]*AlertRule, error) {
	query := `
		SELECT id, geofence_id, vehicle_id, event_type, status, created_at
		FROM alert_rules
		WHERE geofence_id = $1
		AND status = 'active'
		AND (vehicle_id IS NULL OR vehicle_id = $2)
		AND (event_type = $3 OR event_type = 'both')
	`
	rows, err := r.pool.Query(ctx, query, geofenceID, vehicleID, eventType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []*AlertRule
	for rows.Next() {
		var a AlertRule
		var vehicleID pgtype.UUID
		if err := rows.Scan(&a.ID, &a.GeofenceID, &vehicleID, &a.EventType, &a.Status, &a.CreatedAt); err != nil {
			return nil, err
		}
		if vehicleID.Valid {
			vid := uuid.UUID(vehicleID.Bytes)
			a.VehicleID = &vid
		}
		rules = append(rules, &a)
	}
	return rules, rows.Err()
}