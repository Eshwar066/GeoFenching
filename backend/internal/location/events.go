package location

import (
	"github.com/google/uuid"
)

type GeofenceEvent struct {
	VehicleID  uuid.UUID
	GeofenceID uuid.UUID
	EventType  string
	Latitude   float64
	Longitude  float64
}

type EventPublisher interface {
	Publish(events []GeofenceEvent)
}