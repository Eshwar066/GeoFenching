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

	severity := req.Severity
	if severity == "" {
		severity = "medium"
	}

	a := &AlertRule{
		GeofenceID:            req.GeofenceID,
		VehicleID:             req.VehicleID,
		EventType:             req.EventType,
		Severity:              severity,
		NotifyViaWebsocket:    req.NotifyViaWebsocket,
		Status:                "active",
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
	for _, e := range events {
		slog.Info("Received event for processing", "vehicle_id", e.VehicleID, "geofence_id", e.GeofenceID, "event_type", e.EventType)
	}
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
			slog.Error("Failed to get matching rules", "error", err)
			continue
		}

		slog.Info("Found matching rules", "geofence_id", e.GeofenceID, "vehicle_id", e.VehicleID, "event_type", e.EventType, "rule_count", len(rules))

		if len(rules) == 0 {
			slog.Info("No matching rules found", "geofence_id", e.GeofenceID, "vehicle_id", e.VehicleID, "event_type", e.EventType)
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

		// Send alerts for each matching rule
		for _, rule := range rules {
			// Only send WebSocket notification if enabled for this rule
			if !rule.NotifyViaWebsocket {
				slog.Info("Rule has notify_via_websocket disabled, skipping", "rule_id", rule.ID)
				continue
			}

			severity := rule.Severity
			if severity == "" {
				severity = "medium"
			}

			// Get driver name for the vehicle
		driverName := ""
		if v != nil {
			driverName = v.DriverName
		}

		timestamp := time.Now().Format("2006-01-02T15:04:05Z07:00")
		eventID := fmt.Sprintf("evt_%s", uuid.New().String()[:8])

		msg := WebSocketMessage{
			EventID:   eventID,
			EventType: e.EventType,
			Timestamp: timestamp,
			Vehicle: VehicleInfo{
				VehicleID:     e.VehicleID,
				VehicleNumber: vehicleNumber,
				DriverName:    driverName,
			},
			Geofence: GeofenceInfo{
				GeofenceID:   e.GeofenceID,
				GeofenceName: geofenceName,
				Category:     category,
			},
			Location: LocationInfo{
				Latitude:  e.Latitude,
				Longitude: e.Longitude,
			},
		}

		slog.Info("Broadcasting alert via WebSocket", "vehicle_number", vehicleNumber, "geofence_name", geofenceName, "event_type", e.EventType)
		s.hub.Broadcast(msg)
		}
	}
}