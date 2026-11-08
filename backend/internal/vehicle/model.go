package vehicle

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Vehicle struct {
	ID          uuid.UUID       `json:"id"`
	VehicleNumber string        `json:"vehicle_number"`
	DriverName  string          `json:"driver_name"`
	VehicleType string          `json:"vehicle_type"`
	Phone       string          `json:"phone"`
	Status      string          `json:"status"`
	CreatedAt   pgtype.Timestamptz `json:"created_at"`
}

type CreateVehicleRequest struct {
	VehicleNumber string `json:"vehicle_number" validate:"required,min=1,max=50"`
	DriverName    string `json:"driver_name" validate:"required,min=1,max=255"`
	VehicleType   string `json:"vehicle_type" validate:"required,oneof=car truck bus motorcycle van"`
	Phone         string `json:"phone" validate:"required,min=10,max=20"`
}

type VehicleResponse struct {
	ID            uuid.UUID `json:"id"`
	VehicleNumber string    `json:"vehicle_number"`
	DriverName    string    `json:"driver_name"`
	VehicleType   string    `json:"vehicle_type"`
	Phone         string    `json:"phone"`
	Status        string    `json:"status"`
	CreatedAt     string    `json:"created_at"`
}

func (v *Vehicle) ToResponse() VehicleResponse {
	return VehicleResponse{
		ID:            v.ID,
		VehicleNumber: v.VehicleNumber,
		DriverName:    v.DriverName,
		VehicleType:   v.VehicleType,
		Phone:         v.Phone,
		Status:        v.Status,
		CreatedAt:     v.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
	}
}