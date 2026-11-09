package location

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/go-playground/validator/v10"
	"geofencing-system/internal/geofence"
	"geofencing-system/internal/vehicle"
)

type Service struct {
	repo             *Repository
	geofenceService  *geofence.Service
	vehicleService   *vehicle.Service
	eventPublisher   EventPublisher
	validate         *validator.Validate
}

func NewService(pool *pgxpool.Pool, geofenceService *geofence.Service, vehicleService *vehicle.Service, eventPublisher EventPublisher) *Service {
	return &Service{
		repo:            NewRepository(pool),
		geofenceService: geofenceService,
		vehicleService:  vehicleService,
		eventPublisher:  eventPublisher,
		validate:        validator.New(),
	}
}

func (s *Service) UpdateLocation(ctx context.Context, req UpdateLocationRequest) (*LocationResponse, error) {
	if err := s.validate.Struct(req); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	_, err := s.vehicleService.GetByID(ctx, req.VehicleID)
	if err != nil {
		return nil, fmt.Errorf("vehicle lookup: %w", err)
	}

	previousStates, err := s.repo.GetGeofenceStates(ctx, req.VehicleID)
	if err != nil {
		return nil, fmt.Errorf("get previous states: %w", err)
	}

	containingGeofences, err := s.geofenceService.GetContaining(ctx, req.Longitude, req.Latitude)
	if err != nil {
		return nil, fmt.Errorf("find containing geofences: %w", err)
	}

	currentStates := make(map[uuid.UUID]bool)
	for _, g := range containingGeofences {
		currentStates[g.ID] = true
	}

	entered := []GeofenceEventInfo{}
	exited := []GeofenceEventInfo{}
	eventsToSave := []GeofenceEvent{}

	for geofenceID := range currentStates {
		if !previousStates[geofenceID] {
			g, _ := s.geofenceService.GetByID(ctx, geofenceID)
			name := ""
			category := ""
			if g != nil {
				name = g.Name
				category = g.Category
			}
			entered = append(entered, GeofenceEventInfo{
				GeofenceID:   geofenceID,
				GeofenceName: name,
				Category:     category,
				EventType:    "entry",
			})
			eventsToSave = append(eventsToSave, GeofenceEvent{
				VehicleID:  req.VehicleID,
				GeofenceID: geofenceID,
				EventType:  "entry",
				Latitude:   req.Latitude,
				Longitude:  req.Longitude,
			})
		}
	}

	for geofenceID, wasInside := range previousStates {
		if !currentStates[geofenceID] && wasInside {
			g, _ := s.geofenceService.GetByID(ctx, geofenceID)
			name := ""
			category := ""
			if g != nil {
				name = g.Name
				category = g.Category
			}
			exited = append(exited, GeofenceEventInfo{
				GeofenceID:   geofenceID,
				GeofenceName: name,
				Category:     category,
				EventType:    "exit",
			})
			eventsToSave = append(eventsToSave, GeofenceEvent{
				VehicleID:  req.VehicleID,
				GeofenceID: geofenceID,
				EventType:  "exit",
				Latitude:   req.Latitude,
				Longitude:  req.Longitude,
			})
		}
	}

	loc, err := s.repo.SaveLocation(ctx, req.VehicleID, req.Longitude, req.Latitude)
	if err != nil {
		return nil, fmt.Errorf("save location: %w", err)
	}

	if err := s.repo.UpdateGeofenceStates(ctx, req.VehicleID, currentStates); err != nil {
		return nil, fmt.Errorf("update geofence states: %w", err)
	}

	if err := s.repo.SaveEvents(ctx, eventsToSave); err != nil {
		return nil, fmt.Errorf("save events: %w", err)
	}

	slog.Info("Location update - events to save", "count", len(eventsToSave), "publisher", s.eventPublisher != nil)
	if len(eventsToSave) > 0 && s.eventPublisher != nil {
		slog.Info("Publishing events to alert service", "count", len(eventsToSave))
		go s.eventPublisher.Publish(eventsToSave)
	}

	geofenceIDs := make([]uuid.UUID, 0, len(containingGeofences))
	geofenceNames := make([]string, 0, len(containingGeofences))
	for _, g := range containingGeofences {
		geofenceIDs = append(geofenceIDs, g.ID)
		geofenceNames = append(geofenceNames, g.Name)
	}

	recordedAt := time.Now()
	if loc.RecordedAt.Valid {
		recordedAt = loc.RecordedAt.Time
	}

	return &LocationResponse{
		VehicleID:     req.VehicleID,
		Latitude:      req.Latitude,
		Longitude:     req.Longitude,
		GeofenceIDs:   geofenceIDs,
		GeofenceNames: geofenceNames,
		Entered:       entered,
		Exited:        exited,
		RecordedAt:    recordedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

func (s *Service) GetCurrentLocation(ctx context.Context, vehicleID uuid.UUID) (*CurrentLocationResponse, error) {
	v, err := s.vehicleService.GetByID(ctx, vehicleID)
	if err != nil {
		return nil, err
	}
	if v == nil {
		return nil, fmt.Errorf("vehicle not found")
	}

	loc, err := s.repo.GetCurrentLocation(ctx, vehicleID)
	if err != nil {
		return nil, err
	}
	if loc == nil {
		return &CurrentLocationResponse{
			VehicleID:     vehicleID,
			VehicleNumber: v.VehicleNumber,
		}, nil
	}

	states, err := s.repo.GetGeofenceStates(ctx, vehicleID)
	if err != nil {
		return nil, err
	}

	geofenceIDs := make([]uuid.UUID, 0, len(states))
	geofenceNames := make([]string, 0, len(states))
	for id, inside := range states {
		if inside {
			g, _ := s.geofenceService.GetByID(ctx, id)
			if g != nil {
				geofenceIDs = append(geofenceIDs, id)
				geofenceNames = append(geofenceNames, g.Name)
			}
		}
	}

	recordedAt := time.Now()
	if loc.RecordedAt.Valid {
		recordedAt = loc.RecordedAt.Time
	}

	return &CurrentLocationResponse{
		VehicleID:     vehicleID,
		VehicleNumber: v.VehicleNumber,
		Latitude:      loc.Latitude,
		Longitude:     loc.Longitude,
		GeofenceIDs:   geofenceIDs,
		GeofenceNames: geofenceNames,
		RecordedAt:    recordedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}