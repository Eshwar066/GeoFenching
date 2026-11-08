package alert

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type AlertRule struct {
	ID         uuid.UUID       `json:"id"`
	GeofenceID uuid.UUID       `json:"geofence_id"`
	VehicleID  *uuid.UUID      `json:"vehicle_id,omitempty"`
	EventType  string          `json:"event_type"`
	Status     string          `json:"status"`
	CreatedAt  pgtype.Timestamptz `json:"created_at"`
}

type CreateAlertRuleRequest struct {
	GeofenceID uuid.UUID  `json:"geofence_id" validate:"required"`
	VehicleID  *uuid.UUID `json:"vehicle_id,omitempty"`
	EventType  string     `json:"event_type" validate:"required,oneof=entry exit both"`
}

type AlertRuleResponse struct {
	ID         uuid.UUID  `json:"id"`
	GeofenceID uuid.UUID  `json:"geofence_id"`
	VehicleID  *uuid.UUID `json:"vehicle_id,omitempty"`
	EventType  string     `json:"event_type"`
	Status     string     `json:"status"`
	CreatedAt  string     `json:"created_at"`
}

func (a *AlertRule) ToResponse() AlertRuleResponse {
	return AlertRuleResponse{
		ID:         a.ID,
		GeofenceID: a.GeofenceID,
		VehicleID:  a.VehicleID,
		EventType:  a.EventType,
		Status:     a.Status,
		CreatedAt:  a.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
	}
}

type AlertEvent struct {
	ID           uuid.UUID `json:"id"`
	VehicleID    uuid.UUID `json:"vehicle_id"`
	VehicleNumber string   `json:"vehicle_number"`
	GeofenceID   uuid.UUID `json:"geofence_id"`
	GeofenceName string    `json:"geofence_name"`
	EventType    string    `json:"event_type"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	OccurredAt   string    `json:"occurred_at"`
}

type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}