package violation

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	repo *Repository
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{repo: NewRepository(pool)}
}

func (s *Service) List(ctx context.Context, filters ViolationFilters) ([]*ViolationEvent, int, error) {
	return s.repo.List(ctx, filters)
}

func ParseTime(s string) (*pgtype.Timestamptz, error) {
	if s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02T15:04:05Z07:00", s)
	if err != nil {
		t, err = time.Parse("2006-01-02", s)
		if err != nil {
			return nil, fmt.Errorf("invalid date format: %w", err)
		}
	}
	return &pgtype.Timestamptz{Time: t, Valid: true}, nil
}

func ParseUUID(s string) (*uuid.UUID, error) {
	if s == "" {
		return nil, nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return nil, fmt.Errorf("invalid UUID: %w", err)
	}
	return &id, nil
}