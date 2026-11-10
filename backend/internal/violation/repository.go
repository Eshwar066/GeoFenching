package violation

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func parsePostGISPoint(point string) (float64, float64) {
	// PostGIS returns POINT(longitude latitude) format
	re := regexp.MustCompile(`POINT\(([0-9.-]+)\s+([0-9.-]+)\)`)
	matches := re.FindStringSubmatch(point)
	if len(matches) == 3 {
		lng, _ := strconv.ParseFloat(matches[1], 64)
		lat, _ := strconv.ParseFloat(matches[2], 64)
		return lat, lng
	}
	return 0, 0
}

func (r *Repository) List(ctx context.Context, filters ViolationFilters) ([]*ViolationEvent, int, error) {
	whereClauses := []string{"1=1"}
	args := []any{}
	argIdx := 1

	if filters.VehicleID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("ge.vehicle_id = $%d", argIdx))
		args = append(args, *filters.VehicleID)
		argIdx++
	}

	if filters.GeofenceID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("ge.geofence_id = $%d", argIdx))
		args = append(args, *filters.GeofenceID)
		argIdx++
	}

	if filters.EventType != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("ge.event_type = $%d", argIdx))
		args = append(args, filters.EventType)
		argIdx++
	}

	if filters.StartDate != nil && filters.StartDate.Valid {
		whereClauses = append(whereClauses, fmt.Sprintf("ge.occurred_at >= $%d", argIdx))
		args = append(args, filters.StartDate.Time)
		argIdx++
	}

	if filters.EndDate != nil && filters.EndDate.Valid {
		whereClauses = append(whereClauses, fmt.Sprintf("ge.occurred_at <= $%d", argIdx))
		args = append(args, filters.EndDate.Time)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM geofence_events ge
		JOIN vehicles v ON ge.vehicle_id = v.id
		JOIN geofences g ON ge.geofence_id = g.id
		WHERE %s
	`, whereSQL)

	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := filters.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := filters.Offset
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(`
		SELECT ge.id, ge.vehicle_id, v.vehicle_number, ge.geofence_id, g.name,
		       ge.event_type, ST_AsText(ge.location), ge.occurred_at
		FROM geofence_events ge
		JOIN vehicles v ON ge.vehicle_id = v.id
		JOIN geofences g ON ge.geofence_id = g.id
		WHERE %s
		ORDER BY ge.occurred_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []*ViolationEvent
	for rows.Next() {
		var e ViolationEvent
		if err := rows.Scan(
			&e.ID, &e.VehicleID, &e.VehicleNumber, &e.GeofenceID, &e.GeofenceName,
			&e.EventType, &e.Location, &e.OccurredAt,
		); err != nil {
			return nil, 0, err
		}
		if e.Location != "" {
			e.Latitude, e.Longitude = parsePostGISPoint(e.Location)
		}
		events = append(events, &e)
	}
	return events, total, rows.Err()
}