package violation

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type ViolationEvent struct {
	ID            uuid.UUID `json:"id"`
	VehicleID     uuid.UUID `json:"vehicle_id"`
	VehicleNumber string    `json:"vehicle_number"`
	GeofenceID    uuid.UUID `json:"geofence_id"`
	GeofenceName  string    `json:"geofence_name"`
	EventType     string    `json:"event_type"`
	Location      string    `json:"-"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	OccurredAt    pgtype.Timestamptz `json:"occurred_at"`
}

type ViolationResponse struct {
	ID            uuid.UUID `json:"id"`
	VehicleID     uuid.UUID `json:"vehicle_id"`
	VehicleNumber string    `json:"vehicle_number"`
	GeofenceID    uuid.UUID `json:"geofence_id"`
	GeofenceName  string    `json:"geofence_name"`
	EventType     string    `json:"event_type"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	OccurredAt    string    `json:"occurred_at"`
}

type ViolationFilters struct {
	VehicleID  *uuid.UUID
	GeofenceID *uuid.UUID
	EventType  string
	StartDate  *pgtype.Timestamptz
	EndDate    *pgtype.Timestamptz
	Limit      int
	Offset     int
}

func (v *ViolationEvent) ToResponse() ViolationResponse {
	occurredAt := ""
	if v.OccurredAt.Valid {
		occurredAt = v.OccurredAt.Time.Format("2006-01-02T15:04:05Z07:00")
	}
	return ViolationResponse{
		ID:            v.ID,
		VehicleID:     v.VehicleID,
		VehicleNumber: v.VehicleNumber,
		GeofenceID:    v.GeofenceID,
		GeofenceName:  v.GeofenceName,
		EventType:     v.EventType,
		Latitude:      v.Latitude,
		Longitude:     v.Longitude,
		OccurredAt:    occurredAt,
	}
}