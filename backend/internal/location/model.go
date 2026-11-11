package location

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type UpdateLocationRequest struct {
	VehicleID uuid.UUID `json:"vehicle_id" validate:"required"`
	Latitude  float64   `json:"latitude" validate:"required,gte=-90,lte=90"`
	Longitude float64   `json:"longitude" validate:"required,gte=-180,lte=180"`
	Timestamp string    `json:"timestamp,omitempty"`
}

type LocationResponse struct {
	VehicleID       uuid.UUID            `json:"vehicle_id"`
	Latitude        float64              `json:"latitude"`
	Longitude       float64              `json:"longitude"`
	GeofenceIDs     []uuid.UUID          `json:"geofence_ids"`
	GeofenceNames   []string             `json:"geofence_names"`
	Entered         []GeofenceEventInfo  `json:"entered"`
	Exited          []GeofenceEventInfo  `json:"exited"`
	RecordedAt      string               `json:"recorded_at"`
	LocationUpdated bool                 `json:"location_updated"`
}

type GeofenceEventInfo struct {
	GeofenceID   uuid.UUID `json:"geofence_id"`
	GeofenceName string    `json:"geofence_name"`
	Category     string    `json:"category"`
	EventType    string    `json:"event_type"`
}

type CurrentLocationResponse struct {
	VehicleID     uuid.UUID   `json:"vehicle_id"`
	VehicleNumber string      `json:"vehicle_number"`
	Latitude      float64     `json:"latitude"`
	Longitude     float64     `json:"longitude"`
	GeofenceIDs   []uuid.UUID `json:"geofence_ids"`
	GeofenceNames []string    `json:"geofence_names"`
	RecordedAt    string      `json:"recorded_at"`
}

type VehicleLocation struct {
	ID        uuid.UUID `json:"id"`
	VehicleID uuid.UUID `json:"vehicle_id"`
	Location  string    `json:"-"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	RecordedAt pgtype.Timestamptz `json:"recorded_at"`
}