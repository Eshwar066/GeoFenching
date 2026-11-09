package vehicle

import (
	"context"
	"fmt"

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

func (r *Repository) Create(ctx context.Context, v *Vehicle) error {
	query := `
		INSERT INTO vehicles (vehicle_number, driver_name, vehicle_type, phone, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err := r.pool.QueryRow(ctx, query, v.VehicleNumber, v.DriverName, v.VehicleType, v.Phone, v.Status).
		Scan(&v.ID, &v.CreatedAt)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Vehicle, error) {
	query := `
		SELECT id, vehicle_number, driver_name, vehicle_type, phone, status, created_at
		FROM vehicles WHERE id = $1
	`
	var v Vehicle
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&v.ID, &v.VehicleNumber, &v.DriverName, &v.VehicleType, &v.Phone, &v.Status, &v.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &v, err
}

func (r *Repository) GetByVehicleNumber(ctx context.Context, vehicleNumber string) (*Vehicle, error) {
	query := `
		SELECT id, vehicle_number, driver_name, vehicle_type, phone, status, created_at
		FROM vehicles WHERE vehicle_number = $1
	`
	var v Vehicle
	err := r.pool.QueryRow(ctx, query, vehicleNumber).Scan(
		&v.ID, &v.VehicleNumber, &v.DriverName, &v.VehicleType, &v.Phone, &v.Status, &v.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &v, err
}

func (r *Repository) List(ctx context.Context, limit, offset int) ([]*Vehicle, int, error) {
	countQuery := "SELECT COUNT(*) FROM vehicles"
	var total int
	if err := r.pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, vehicle_number, driver_name, vehicle_type, phone, status, created_at
		FROM vehicles
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var vehicles []*Vehicle
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(&v.ID, &v.VehicleNumber, &v.DriverName, &v.VehicleType, &v.Phone, &v.Status, &v.CreatedAt); err != nil {
			return nil, 0, err
		}
		vehicles = append(vehicles, &v)
	}
	return vehicles, total, rows.Err()
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	query := `UPDATE vehicles SET status = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, id)
	return err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM vehicles WHERE id = $1`
	result, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("vehicle not found")
	}
	return nil
}