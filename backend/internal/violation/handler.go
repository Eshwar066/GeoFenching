package violation

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"geofencing-system/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/violations/history", h.List)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	vehicleID, err := ParseUUID(r.URL.Query().Get("vehicle_id"))
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	geofenceID, err := ParseUUID(r.URL.Query().Get("geofence_id"))
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	eventType := r.URL.Query().Get("event_type")

	startDate, err := ParseTime(r.URL.Query().Get("start_date"))
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	endDate, err := ParseTime(r.URL.Query().Get("end_date"))
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	limit := 20
	offset := 0

	filters := ViolationFilters{
		VehicleID:  vehicleID,
		GeofenceID: geofenceID,
		EventType:  eventType,
		StartDate:  startDate,
		EndDate:    endDate,
		Limit:      limit,
		Offset:     offset,
	}

	events, total, err := h.service.List(ctx, filters)
	if err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}

	resp := make([]ViolationResponse, len(events))
	for i, e := range events {
		resp[i] = e.ToResponse()
	}

	middleware.WriteSuccess(w, r, map[string]any{
		"violations":  resp,
		"total_count": total,
		"limit":       limit,
		"offset":      offset,
	})
}