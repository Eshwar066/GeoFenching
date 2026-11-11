package alert

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type AlertRule struct {
	ID                  uuid.UUID       `json:"id"`
	GeofenceID          uuid.UUID       `json:"geofence_id"`
	VehicleID           *uuid.UUID      `json:"vehicle_id,omitempty"`
	EventType           string          `json:"event_type"`
	Severity            string          `json:"severity"`
	NotifyViaWebsocket  bool            `json:"notify_via_websocket"`
	Status              string          `json:"status"`
	CreatedAt           pgtype.Timestamptz `json:"created_at"`
}

type CreateAlertRuleRequest struct {
	GeofenceID            uuid.UUID  `json:"geofence_id" validate:"required"`
	VehicleID             *uuid.UUID `json:"vehicle_id,omitempty"`
	EventType             string     `json:"event_type" validate:"required,oneof=entry exit both"`
	Severity              string     `json:"severity,omitempty" validate:"omitempty,oneof=low medium high critical"`
	NotifyViaWebsocket    bool       `json:"notify_via_websocket,omitempty"`
}

type AlertRuleResponse struct {
	AlertID             uuid.UUID  `json:"alert_id"`
	GeofenceID          uuid.UUID  `json:"geofence_id"`
	VehicleID           *uuid.UUID `json:"vehicle_id,omitempty"`
	EventType           string     `json:"event_type"`
	Severity            string     `json:"severity"`
	NotifyViaWebsocket  bool       `json:"notify_via_websocket"`
	Status              string     `json:"status"`
	CreatedAt           string     `json:"created_at"`
}

func (a *AlertRule) ToResponse() AlertRuleResponse {
	return AlertRuleResponse{
		AlertID:             a.ID,
		GeofenceID:          a.GeofenceID,
		VehicleID:           a.VehicleID,
		EventType:           a.EventType,
		Severity:            a.Severity,
		NotifyViaWebsocket:  a.NotifyViaWebsocket,
		Status:              a.Status,
		CreatedAt:           a.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
	}
}

type AlertEvent struct {
	ID           uuid.UUID `json:"id"`
	VehicleID    uuid.UUID `json:"vehicle_id"`
	VehicleNumber string   `json:"vehicle_number"`
	GeofenceID   uuid.UUID `json:"geofence_id"`
	GeofenceName string    `json:"geofence_name"`
	EventType    string    `json:"event_type"`
	Category     string    `json:"category"`
	Severity     string    `json:"severity"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	Timestamp    string    `json:"timestamp"`
}

type VehicleInfo struct {
	VehicleID     uuid.UUID `json:"vehicle_id"`
	VehicleNumber string    `json:"vehicle_number"`
	DriverName    string    `json:"driver_name"`
}

type GeofenceInfo struct {
	GeofenceID   uuid.UUID `json:"geofence_id"`
	GeofenceName string    `json:"geofence_name"`
	Category     string    `json:"category"`
}

type LocationInfo struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type WebSocketMessage struct {
	EventID   string      `json:"event_id"`
	EventType string      `json:"event_type"`
	Timestamp string      `json:"timestamp"`
	Vehicle   VehicleInfo `json:"vehicle"`
	Geofence  GeofenceInfo `json:"geofence"`
	Location  LocationInfo `json:"location"`
}