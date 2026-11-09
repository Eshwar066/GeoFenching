package geofence

import (
	"context"
	"fmt"
	"regexp"
	"strconv"

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

func (r *Repository) Create(ctx context.Context, g *Geofence) error {
	coords := make([][2]float64, len(g.Coordinates))
	for i, c := range g.Coordinates {
		coords[i] = [2]float64{c[0], c[1]}
	}
	coords = append(coords, coords[0])

	polygonWKT := coordsToWKT(coords)

	query := `
		INSERT INTO geofences (name, description, boundary, category)
		VALUES ($1, $2, ST_GeomFromText($3, 4326), $4)
		RETURNING id, created_at
	`
	err := r.pool.QueryRow(ctx, query, g.Name, g.Description, polygonWKT, g.Category).
		Scan(&g.ID, &g.CreatedAt)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Geofence, error) {
	query := `
		SELECT id, name, description, ST_AsText(boundary), category, created_at
		FROM geofences WHERE id = $1
	`
	var g Geofence
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&g.ID, &g.Name, &g.Description, &g.Boundary, &g.Category, &g.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	g.Coordinates = parseBoundary(g.Boundary)
	return &g, nil
}

func (r *Repository) List(ctx context.Context, category string, limit, offset int) ([]*Geofence, int, error) {
	where := ""
	args := []any{}
	argIdx := 1

	if category != "" {
		where = "WHERE category = $" + fmt.Sprint(argIdx)
		args = append(args, category)
		argIdx++
	}

	countQuery := "SELECT COUNT(*) FROM geofences " + where
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, name, description, ST_AsText(boundary), category, created_at
		FROM geofences %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var geofences []*Geofence
	for rows.Next() {
		var g Geofence
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.Boundary, &g.Category, &g.CreatedAt); err != nil {
			return nil, 0, err
		}
		g.Coordinates = parseBoundary(g.Boundary)
		geofences = append(geofences, &g)
	}
	return geofences, total, rows.Err()
}

func (r *Repository) GetContainingGeofences(ctx context.Context, longitude, latitude float64) ([]*Geofence, error) {
	query := `
		SELECT id, name, description, ST_AsText(boundary), category, created_at
		FROM geofences
		WHERE ST_Covers(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
	`
	rows, err := r.pool.Query(ctx, query, longitude, latitude)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var geofences []*Geofence
	for rows.Next() {
		var g Geofence
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.Boundary, &g.Category, &g.CreatedAt); err != nil {
			return nil, err
		}
		g.Coordinates = parseBoundary(g.Boundary)
		geofences = append(geofences, &g)
	}
	return geofences, rows.Err()
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM geofences WHERE id = $1`
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("geofence not found")
	}
	return nil
}

func coordsToWKT(coords [][2]float64) string {
	if len(coords) < 4 {
		return ""
	}
	wkt := "POLYGON(("
	for i, c := range coords {
		if i > 0 {
			wkt += ", "
		}
		// PostGIS expects (longitude, latitude) order in WKT
		wkt += fmt.Sprintf("%.8f %.8f", c[1], c[0])
	}
	wkt += "))"
	return wkt
}

func parseBoundary(boundary string) [][]float64 {
	if boundary == "" {
		return [][]float64{}
	}
	var coords [][]float64
	re := regexp.MustCompile(`([0-9.-]+)\s+([0-9.-]+)`)
	matches := re.FindAllStringSubmatch(boundary, -1)
	for _, match := range matches {
		if len(match) == 3 {
			// WKT stores coordinates as (longitude, latitude)
			lng, _ := strconv.ParseFloat(match[1], 64)
			lat, _ := strconv.ParseFloat(match[2], 64)
			coords = append(coords, []float64{lat, lng})
		}
	}
	return coords
}