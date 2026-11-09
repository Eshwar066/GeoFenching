package alert

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/go-playground/validator/v10"
	"geofencing-system/internal/geofence"
	"geofencing-system/internal/location"
	"geofencing-system/internal/vehicle"
)

type Service struct {
	repo            *Repository
	geofenceService *geofence.Service
	vehicleService  *vehicle.Service
	validate        *validator.Validate
	hub             *Hub
	eventChan       chan []GeofenceEvent
}

type GeofenceEvent struct {
	VehicleID  uuid.UUID
	GeofenceID uuid.UUID
	EventType  string
	Latitude   float64
	Longitude  float64
}

func NewService(pool *pgxpool.Pool, geofenceService *geofence.Service, vehicleService *vehicle.Service, hub *Hub) *Service {
	return &Service{
		repo:            NewRepository(pool),
		geofenceService: geofenceService,
		vehicleService:  vehicleService,
		validate:        validator.New(),
		hub:             hub,
		eventChan:       make(chan []GeofenceEvent, 100),
	}
}

func (s *Service) Create(ctx context.Context, req CreateAlertRuleRequest) (*AlertRule, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	a := &AlertRule{
		GeofenceID: req.GeofenceID,
		VehicleID:  req.VehicleID,
		EventType:  req.EventType,
		Status:     "active",
	}

	if err := s.repo.Create(ctx, a); err != nil {
		return nil, fmt.Errorf("create alert rule: %w", err)
	}

	return a, nil
}

func (s *Service) List(ctx context.Context, limit, offset int) ([]*AlertRule, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) Publish(events []location.GeofenceEvent) {
	slog.Info("AlertService.Publish called", "event_count", len(events))
	alertEvents := make([]GeofenceEvent, len(events))
	for i, e := range events {
		alertEvents[i] = GeofenceEvent{
			VehicleID:  e.VehicleID,
			GeofenceID: e.GeofenceID,
			EventType:  e.EventType,
			Latitude:   e.Latitude,
			Longitude:  e.Longitude,
		}
	}

	select {
	case s.eventChan <- alertEvents:
		slog.Info("Published to eventChan", "count", len(alertEvents))
	default:
		slog.Warn("Alert channel full, dropping events", "count", len(alertEvents))
	}
}

func (s *Service) StartEventProcessor(ctx context.Context) {
	go func() {
		for {
			select {
			case events := <-s.eventChan:
				s.processEvents(ctx, events)
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (s *Service) processEvents(ctx context.Context, events []GeofenceEvent) {
	slog.Info("Processing events", "count", len(events))
	for _, e := range events {
		rules, err := s.repo.GetMatchingRules(ctx, e.GeofenceID, e.VehicleID, e.EventType)
		if err != nil {
			continue
		}

		if len(rules) == 0 {
			continue
		}

		v, _ := s.vehicleService.GetByID(ctx, e.VehicleID)
		vehicleNumber := ""
		if v != nil {
			vehicleNumber = v.VehicleNumber
		}

		g, _ := s.geofenceService.GetByID(ctx, e.GeofenceID)
		geofenceName := ""
		category := ""
		if g != nil {
			geofenceName = g.Name
			category = g.Category
		}

		alertMsg := AlertEvent{
			ID:           uuid.New(),
			VehicleID:     e.VehicleID,
			VehicleNumber: vehicleNumber,
			GeofenceID:    e.GeofenceID,
			GeofenceName:  geofenceName,
			EventType:     e.EventType,
			Category:      category,
			Severity:      "medium",
			Latitude:      e.Latitude,
			Longitude:     e.Longitude,
			Timestamp:     time.Now().Format("2006-01-02T15:04:05Z07:00"),
		}

		msg := WebSocketMessage{
			Type: "alert",
			Data: alertMsg,
		}

		s.hub.Broadcast(msg)
	}
}