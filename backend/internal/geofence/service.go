package geofence

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

func (s *Service) Create(ctx context.Context, req CreateGeofenceRequest) (*Geofence, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	if len(req.Coordinates) < 4 {
		return nil, fmt.Errorf("polygon must have at least 4 points")
	}

	first := req.Coordinates[0]
	last := req.Coordinates[len(req.Coordinates)-1]
	if first[0] != last[0] || first[1] != last[1] {
		return nil, fmt.Errorf("polygon must be closed (first and last coordinates must match)")
	}

	g := &Geofence{
		Name:        req.Name,
		Description: req.Description,
		Coordinates: req.Coordinates,
		Category:    req.Category,
	}

	if err := s.repo.Create(ctx, g); err != nil {
		return nil, fmt.Errorf("create geofence: %w", err)
	}

	return g, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Geofence, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context, category string, limit, offset int) ([]*Geofence, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, category, limit, offset)
}

func (s *Service) GetContaining(ctx context.Context, longitude, latitude float64) ([]*Geofence, error) {
	return s.repo.GetContainingGeofences(ctx, longitude, latitude)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}