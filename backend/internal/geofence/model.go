package geofence

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Geofence struct {
	ID          uuid.UUID       `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	Boundary    string          `json:"-"`
	Coordinates [][]float64     `json:"coordinates"`
	Category    string          `json:"category"`
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
}

type CreateGeofenceRequest struct {
	Name        string      `json:"name" validate:"required,min=1,max=255"`
	Description string      `json:"description,omitempty"`
	Coordinates [][]float64 `json:"coordinates" validate:"required,min=4,dive,required,min=2,max=2"`
	Category    string      `json:"category" validate:"required,oneof=general restricted_zone danger_zone safe_zone custom"`
}

type GeofenceResponse struct {
	ID          uuid.UUID   `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Coordinates [][]float64 `json:"coordinates"`
	Category    string      `json:"category"`
	CreatedAt   string      `json:"created_at"`
}

func (g *Geofence) ToResponse() GeofenceResponse {
	coords := g.Coordinates
	if coords == nil && g.Boundary != "" {
		coords = parseBoundary(g.Boundary)
	}
	return GeofenceResponse{
		ID:          g.ID,
		Name:        g.Name,
		Description: g.Description,
		Coordinates: coords,
		Category:    g.Category,
		CreatedAt:   g.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
	}
}