package vehicle

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/go-playground/validator/v10"
)

type Service struct {
	repo     *Repository
	validate *validator.Validate
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{
		repo:     NewRepository(pool),
		validate: validator.New(),
	}
}

func (s *Service) Create(ctx context.Context, req CreateVehicleRequest) (*Vehicle, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	existing, err := s.repo.GetByVehicleNumber(ctx, req.VehicleNumber)
	if err != nil {
		return nil, fmt.Errorf("check vehicle number: %w", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("vehicle number already registered")
	}

	v := &Vehicle{
		VehicleNumber: req.VehicleNumber,
		DriverName:    req.DriverName,
		VehicleType:   req.VehicleType,
		Phone:         req.Phone,
		Status:        "active",
	}

	if err := s.repo.Create(ctx, v); err != nil {
		return nil, fmt.Errorf("create vehicle: %w", err)
	}

	return v, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Vehicle, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) GetByVehicleNumber(ctx context.Context, vehicleNumber string) (*Vehicle, error) {
	return s.repo.GetByVehicleNumber(ctx, vehicleNumber)
}

func (s *Service) List(ctx context.Context, limit, offset int) ([]*Vehicle, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *Service) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	validStatuses := map[string]bool{"active": true, "inactive": true, "maintenance": true}
	if !validStatuses[status] {
		return fmt.Errorf("invalid status")
	}
	return s.repo.UpdateStatus(ctx, id, status)
}